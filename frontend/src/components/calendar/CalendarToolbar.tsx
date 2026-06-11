import { ToolbarProps } from "react-big-calendar";
import { CalendarEvent } from "@/models/calendar_event";
import { Button, ButtonGroup, Box, Typography } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";

export default function CalendarToolbar(
  props: ToolbarProps<CalendarEvent, object>
) {
  const { label, onNavigate, onView, view } = props;
  const navigate = useNavigate();
  const location = useLocation();
  const isAgenda = location.pathname === "/agenda";
  const buttonSx = {
    color: "#373a3c",
    background: "none",
    border: "1px solid #ccc",
    padding: "6px 14px",
    borderRadius: "4px",
    textTransform: "none",
    fontSize: "0.85rem",
    "&:hover": {
      backgroundColor: "#f5f5f5",
      borderColor: "#bbb",
    },
  };

  const activeButtonSx = {
    ...buttonSx,
    backgroundColor: "#1976d2",
    color: "white",
    borderColor: "#1976d2",
    "&:hover": {
      backgroundColor: "#1565c0",
    },
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        mb: 2,
      }}
    >
      {/* LEFT: navigation */}
      <ButtonGroup>
        {isAgenda ? (
          <Button sx={buttonSx} onClick={() => navigate("/")}>
            Back to Calendar
          </Button>
        ) : (
          <>
            <Button sx={buttonSx} onClick={() => onNavigate("PREV")}>
              Back
            </Button>
            <Button sx={buttonSx} onClick={() => onNavigate("TODAY")}>
              Today
            </Button>
            <Button sx={buttonSx} onClick={() => onNavigate("NEXT")}>
              Next
            </Button>
          </>
        )}
      </ButtonGroup>

      {/* CENTER: label */}
      <Typography variant="h6" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>

      {/* RIGHT: view modes */}
      <ButtonGroup>
        <Button
          sx={!isAgenda && view === "month" ? activeButtonSx : buttonSx}
          onClick={() => (isAgenda ? navigate("/") : onView("month"))}
        >
          Month
        </Button>
        <Button
          sx={!isAgenda && view === "week" ? activeButtonSx : buttonSx}
          onClick={() => (isAgenda ? navigate("/") : onView("week"))}
        >
          Week
        </Button>
        <Button
          sx={!isAgenda && view === "day" ? activeButtonSx : buttonSx}
          onClick={() => (isAgenda ? navigate("/") : onView("day"))}
        >
          Day
        </Button>
      </ButtonGroup>
    </Box>
  );
}