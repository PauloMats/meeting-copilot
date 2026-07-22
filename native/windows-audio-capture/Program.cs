using System.Diagnostics;
using System.Text.Json;
using NAudio.CoreAudioApi;
using NAudio.Wave;
using NAudio.Wave.SampleProviders;

namespace MeetingCopilot.AudioCapture;

internal static class Program
{
    private const int OutputSampleRate = 24_000;
    private const int ChunkSamples = 2_400;

    public static async Task<int> Main(string[] args)
    {
        try
        {
            if (args.Contains("--list", StringComparer.OrdinalIgnoreCase))
            {
                WriteDeviceList();
                return 0;
            }

            var deviceId = ReadOption(args, "--device-id");
            var includeMicrophone = args.Contains("--microphone", StringComparer.OrdinalIgnoreCase);
            await CaptureAsync(deviceId, includeMicrophone);
            return 0;
        }
        catch (Exception exception)
        {
            WriteEvent(new
            {
                @event = "error",
                source = exception is MicrophoneCaptureException ? "microphone" : "system",
                message = exception.InnerException is null
                    ? exception.Message
                    : $"{exception.Message} {exception.InnerException.Message}"
            });
            return 1;
        }
    }

    private static void WriteDeviceList()
    {
        using var enumerator = new MMDeviceEnumerator();
        var defaultMultimedia = TryGetDefault(enumerator, DataFlow.Render, Role.Multimedia)?.ID;
        var defaultCommunications = TryGetDefault(enumerator, DataFlow.Render, Role.Communications)?.ID;
        var devices = enumerator
            .EnumerateAudioEndPoints(DataFlow.Render, DeviceState.Active)
            .Select(device => new
            {
                id = device.ID,
                name = device.FriendlyName,
                isDefault = device.ID == defaultMultimedia,
                isDefaultCommunications = device.ID == defaultCommunications
            })
            .OrderByDescending(device => device.isDefault)
            .ThenByDescending(device => device.isDefaultCommunications)
            .ThenBy(device => device.name, StringComparer.CurrentCultureIgnoreCase)
            .ToArray();

        Console.Out.Write(JsonSerializer.Serialize(devices));
    }

    private static async Task CaptureAsync(string? requestedDeviceId, bool includeMicrophone)
    {
        using var enumerator = new MMDeviceEnumerator();
        using var renderDevice = ResolveRenderDevice(enumerator, requestedDeviceId);
        using var loopback = new WasapiLoopbackCapture(renderDevice);
        var systemBuffer = CreateBuffer(loopback.WaveFormat);
        loopback.DataAvailable += (_, eventArgs) =>
            systemBuffer.AddSamples(eventArgs.Buffer, 0, eventArgs.BytesRecorded);

        var systemLevel = new LevelSampleProvider(ToMono24Khz(systemBuffer));
        ISampleProvider systemInput = new VolumeSampleProvider(systemLevel)
        {
            Volume = includeMicrophone ? 0.72f : 1f
        };

        WasapiCapture? microphone = null;
        MMDevice? microphoneDevice = null;
        LevelSampleProvider? microphoneLevel = null;
        try
        {
            if (includeMicrophone)
            {
                try
                {
                    microphoneDevice =
                        TryGetDefault(enumerator, DataFlow.Capture, Role.Communications)
                        ?? TryGetDefault(enumerator, DataFlow.Capture, Role.Multimedia)
                        ?? throw new InvalidOperationException("No active default microphone was found.");
                    microphone = new WasapiCapture(microphoneDevice);
                    var microphoneBuffer = CreateBuffer(microphone.WaveFormat);
                    microphone.DataAvailable += (_, eventArgs) =>
                        microphoneBuffer.AddSamples(eventArgs.Buffer, 0, eventArgs.BytesRecorded);
                    microphoneLevel = new LevelSampleProvider(ToMono24Khz(microphoneBuffer));
                    var microphoneInput = new VolumeSampleProvider(microphoneLevel) { Volume = 0.72f };
                    systemInput = new MixingSampleProvider(new[] { systemInput, microphoneInput })
                    {
                        ReadFully = true
                    };
                }
                catch (Exception exception)
                {
                    throw new MicrophoneCaptureException("Could not initialize the default microphone.", exception);
                }
            }

            using var cancellation = new CancellationTokenSource();
            Console.CancelKeyPress += (_, eventArgs) =>
            {
                eventArgs.Cancel = true;
                cancellation.Cancel();
            };

            try
            {
                loopback.StartRecording();
            }
            catch (Exception exception)
            {
                throw new InvalidOperationException(
                    $"Could not start WASAPI loopback for '{renderDevice.FriendlyName}'.",
                    exception);
            }

            if (microphone is not null)
            {
                try
                {
                    microphone.StartRecording();
                }
                catch (Exception exception)
                {
                    loopback.StopRecording();
                    throw new MicrophoneCaptureException("Could not start the default microphone.", exception);
                }
            }

            WriteEvent(new
            {
                @event = "ready",
                outputDevice = renderDevice.FriendlyName,
                microphoneDevice = microphoneDevice?.FriendlyName,
                sampleRate = OutputSampleRate,
                channels = 1
            });

            await StreamPcmAsync(systemInput, systemLevel, microphoneLevel, cancellation.Token);
            loopback.StopRecording();
            microphone?.StopRecording();
        }
        finally
        {
            microphone?.Dispose();
            microphoneDevice?.Dispose();
        }
    }

    private static async Task StreamPcmAsync(
        ISampleProvider mixedInput,
        LevelSampleProvider systemLevel,
        LevelSampleProvider? microphoneLevel,
        CancellationToken cancellationToken)
    {
        var samples = new float[ChunkSamples];
        var bytes = new byte[ChunkSamples * sizeof(short)];
        var output = Console.OpenStandardOutput();
        var clock = Stopwatch.StartNew();
        var nextChunkAt = TimeSpan.Zero;

        while (!cancellationToken.IsCancellationRequested)
        {
            Array.Clear(samples);
            var read = mixedInput.Read(samples, 0, samples.Length);
            for (var index = 0; index < samples.Length; index++)
            {
                var sample = index < read ? Math.Clamp(samples[index], -1f, 1f) : 0f;
                var value = sample < 0 ? sample * 32768f : sample * 32767f;
                var pcm = (short)value;
                bytes[index * 2] = (byte)(pcm & 0xff);
                bytes[index * 2 + 1] = (byte)((pcm >> 8) & 0xff);
            }

            await output.WriteAsync(bytes, cancellationToken);
            await output.FlushAsync(cancellationToken);
            WriteEvent(new
            {
                @event = "levels",
                system = NormalizeLevel(systemLevel.Level),
                microphone = microphoneLevel is null ? (double?)null : NormalizeLevel(microphoneLevel.Level)
            });

            nextChunkAt += TimeSpan.FromMilliseconds(100);
            var delay = nextChunkAt - clock.Elapsed;
            if (delay > TimeSpan.Zero)
            {
                await Task.Delay(delay, cancellationToken);
            }
            else if (delay < TimeSpan.FromMilliseconds(-500))
            {
                nextChunkAt = clock.Elapsed;
            }
        }
    }

    private static BufferedWaveProvider CreateBuffer(WaveFormat waveFormat) => new(waveFormat)
    {
        BufferDuration = TimeSpan.FromSeconds(3),
        DiscardOnBufferOverflow = true,
        ReadFully = true
    };

    private static ISampleProvider ToMono24Khz(IWaveProvider input)
    {
        ISampleProvider samples = input.ToSampleProvider();
        if (samples.WaveFormat.Channels != 1)
        {
            samples = new DownmixToMonoSampleProvider(samples);
        }
        if (samples.WaveFormat.SampleRate != OutputSampleRate)
        {
            samples = new WdlResamplingSampleProvider(samples, OutputSampleRate);
        }
        return samples;
    }

    private static MMDevice ResolveRenderDevice(MMDeviceEnumerator enumerator, string? requestedId)
    {
        if (!string.IsNullOrWhiteSpace(requestedId))
        {
            var requested = enumerator
                .EnumerateAudioEndPoints(DataFlow.Render, DeviceState.Active)
                .FirstOrDefault(device => device.ID == requestedId);
            if (requested is not null) return requested;
            throw new InvalidOperationException("The selected Windows output device is no longer available.");
        }

        return TryGetDefault(enumerator, DataFlow.Render, Role.Multimedia)
            ?? throw new InvalidOperationException("No active default Windows output device was found.");
    }

    private static MMDevice? TryGetDefault(
        MMDeviceEnumerator enumerator,
        DataFlow flow,
        Role role)
    {
        try
        {
            return enumerator.GetDefaultAudioEndpoint(flow, role);
        }
        catch
        {
            return null;
        }
    }

    private static string? ReadOption(string[] args, string name)
    {
        var index = Array.FindIndex(args, argument =>
            string.Equals(argument, name, StringComparison.OrdinalIgnoreCase));
        return index >= 0 && index + 1 < args.Length ? args[index + 1] : null;
    }

    private static double NormalizeLevel(double rms)
    {
        if (rms < 0.001) return 0;
        var decibels = 20 * Math.Log10(rms);
        return Math.Clamp((decibels + 60) / 60, 0, 1);
    }

    private static void WriteEvent(object payload) =>
        Console.Error.WriteLine(JsonSerializer.Serialize(payload));
}

internal sealed class LevelSampleProvider(ISampleProvider source) : ISampleProvider
{
    private double _level;

    public WaveFormat WaveFormat => source.WaveFormat;
    public double Level => _level;

    public int Read(float[] buffer, int offset, int count)
    {
        var read = source.Read(buffer, offset, count);
        if (read == 0)
        {
            _level *= 0.72;
            return 0;
        }

        double sum = 0;
        for (var index = offset; index < offset + read; index++)
        {
            sum += buffer[index] * buffer[index];
        }
        var rms = Math.Sqrt(sum / read);
        _level = Math.Max(rms, _level * 0.72);
        return read;
    }
}

internal sealed class DownmixToMonoSampleProvider : ISampleProvider
{
    private readonly ISampleProvider _source;
    private readonly int _channels;
    private float[] _sourceBuffer = [];

    public DownmixToMonoSampleProvider(ISampleProvider source)
    {
        _source = source;
        _channels = source.WaveFormat.Channels;
        WaveFormat = WaveFormat.CreateIeeeFloatWaveFormat(source.WaveFormat.SampleRate, 1);
    }

    public WaveFormat WaveFormat { get; }

    public int Read(float[] buffer, int offset, int count)
    {
        var required = count * _channels;
        if (_sourceBuffer.Length < required) _sourceBuffer = new float[required];
        var read = _source.Read(_sourceBuffer, 0, required);
        var frames = read / _channels;
        for (var frame = 0; frame < frames; frame++)
        {
            double sum = 0;
            for (var channel = 0; channel < _channels; channel++)
            {
                sum += _sourceBuffer[frame * _channels + channel];
            }
            buffer[offset + frame] = (float)(sum / _channels);
        }
        return frames;
    }
}

internal sealed class MicrophoneCaptureException(string message, Exception innerException)
    : Exception(message, innerException);
