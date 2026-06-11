import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Button,
  Box,
} from "@mui/material";
import { Link } from "react-router-dom";
import { CalendarEvent } from "@/models/calendar_event";

type Props = {
  open: boolean;
  event: CalendarEvent | null;
  onClose: () => void;
};

export default function EventModal({ open, event, onClose }: Props) {
  if (!event) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{event.title}</DialogTitle>

      <DialogContent>
        <Box display="flex" flexDirection="column" gap={1}>
          <Typography>
            Start: {event.start.toLocaleString()}
          </Typography>

          <Typography>
            End: {event.end?.toLocaleString() ?? "—"}
          </Typography>

          <Typography>
            Location: {event.location ?? "—"}
          </Typography>

          <Typography>
            Field: {event.field ?? "—"}
          </Typography>

          <Typography>
            Type: {event.eventType}
          </Typography>

          <Box mt={2} display="flex" justifyContent="space-between">
            <Button onClick={onClose}>Close</Button>

            {event.field_id && (
              <Button
                component={Link}
                to={`/fields/${event.field_id}`}
                variant="contained"
              >
                View Field
              </Button>
            )}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}