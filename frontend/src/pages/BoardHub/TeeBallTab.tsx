import GroupChecklistTab from "./GroupChecklistTab"

const DESCRIPTION =
  "Tee Ball division planning checklist — registration, roster formation, coach assignments, Opening Day, " +
  "and end-of-season celebration. No evaluations or draft required for Tee Ball."

export default function TeeBallTab() {
  return <GroupChecklistTab group="tee_ball" description={DESCRIPTION} />
}
