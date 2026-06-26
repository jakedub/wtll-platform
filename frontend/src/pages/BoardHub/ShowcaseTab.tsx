import GroupChecklistTab from "./GroupChecklistTab"

const DESCRIPTION =
  "Planning checklist for the WTLL Showcase — event scheduling, team invites, umpire coverage, and day-of logistics. " +
  "Dates will be TBD until the venue and format are confirmed each season."

export default function ShowcaseTab() {
  return <GroupChecklistTab group="showcase" description={DESCRIPTION} />
}
