import GroupChecklistTab from "./GroupChecklistTab"

const DESCRIPTION =
  "Annual fundraising planning checklist — campaign approvals, sponsorship outreach, Opening Day fundraiser, " +
  "and end-of-season reporting. Coordinate with the Finance › Fundraising page for detailed plan tracking."

export default function FundraisingHubTab() {
  return <GroupChecklistTab group="fundraising" description={DESCRIPTION} />
}
