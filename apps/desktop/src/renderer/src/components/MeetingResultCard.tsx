import {
  DailyResultSchema,
  MeetingSummarySchema,
  type MeetingResult,
  type MeetingType
} from "@meeting-copilot/contracts";
import { DailySummaryCard } from "./DailySummaryCard";
import { MeetingSummaryCard } from "./MeetingSummaryCard";

export function MeetingResultCard({
  result,
  meetingType,
  portuguese
}: {
  result: MeetingResult;
  meetingType: MeetingType;
  portuguese: boolean;
}) {
  return meetingType === "daily" ? (
    <DailySummaryCard summary={DailyResultSchema.parse(result)} portuguese={portuguese} />
  ) : (
    <MeetingSummaryCard summary={MeetingSummarySchema.parse(result)} portuguese={portuguese} />
  );
}
