import { google } from 'googleapis'

// Build an authenticated Google Calendar client using the service account
function getCalendarClient() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !privateKey) {
    throw new Error('Missing Google service account credentials in environment variables')
  }

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })

  return google.calendar({ version: 'v3', auth })
}

export interface CalendarEventInput {
  title: string           // e.g. "Skin Treatment - Arslan Saghir"
  description?: string    // e.g. service description + notes
  date: string            // ISO date: "2026-03-15"
  startTime: string       // "HH:MM:SS" or "HH:MM"
  endTime?: string        // "HH:MM:SS" or "HH:MM" — optional
  customerEmail?: string  // invite the customer as an attendee
  doctorEmail?: string    // invite the doctor/therapist
  location?: string       // clinic location
  timezone?: string       // default: 'Europe/London'
}

export interface CalendarEventResult {
  eventId: string
  eventLink: string
}

// Create a calendar event and return its ID + link
export async function createCalendarEvent(
  input: CalendarEventInput
): Promise<CalendarEventResult> {
  const calendar = getCalendarClient()
  const calendarId = process.env.GOOGLE_CALENDAR_ID!
  const tz = input.timezone || 'Asia/Karachi';

  // Build start datetime
  const startDateTime = `${input.date}T${input.startTime.length === 5 ? input.startTime + ':00' : input.startTime}`

  // Build end datetime — default to 1 hour after start if not provided
  let endDateTime: string
  if (input.endTime) {
    endDateTime = `${input.date}T${input.endTime.length === 5 ? input.endTime + ':00' : input.endTime}`
  } else {
    const start = new Date(`${input.date}T${startDateTime.split('T')[1]}`)
    start.setHours(start.getHours() + 1)
    endDateTime = `${input.date}T${start.toTimeString().slice(0, 8)}`
  }

  // Build attendees list
  // const attendees: { email: string }[] = []
  // if (input.customerEmail) attendees.push({ email: input.customerEmail })
  // if (input.doctorEmail)   attendees.push({ email: input.doctorEmail })

 const { data } = await calendar.events.insert({
  calendarId,
  sendUpdates: 'none',
  requestBody: {
    summary:     input.title,
    description: input.description,
    location:    input.location,
    start: { dateTime: startDateTime, timeZone: tz },
    end:   { dateTime: endDateTime,   timeZone: tz },
    // attendees removed — service accounts require Google Workspace
    // Domain-Wide Delegation to invite attendees (paid feature).
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 },
      ],
    },
  },
})

  if (!data.id) throw new Error('Google Calendar event creation failed — no event ID returned')

  return {
    eventId:   data.id,
    eventLink: data.htmlLink ?? '',
  }
}

// Update an existing event (e.g. when booking is rescheduled)
export async function updateCalendarEvent(
  eventId: string,
  input: Partial<CalendarEventInput>
): Promise<void> {
  const calendar = getCalendarClient()
  const calendarId = process.env.GOOGLE_CALENDAR_ID!

  const patch: Record<string, any> = {}
  if (input.title) patch.summary = input.title
  if (input.description) patch.description = input.description
  if (input.location) patch.location = input.location

  if (input.date && input.startTime) {
    const tz = input.timezone || 'Asia/Karachi';
    patch.start = { dateTime: `${input.date}T${input.startTime}`, timeZone: tz }
  }
  if (input.date && input.endTime) {
   const tz = input.timezone || 'Asia/Karachi';
    patch.end = { dateTime: `${input.date}T${input.endTime}`, timeZone: tz }
  }

  await calendar.events.patch({
    calendarId,
    eventId,
    sendUpdates: 'none',
    requestBody: patch,
  })
}

// Cancel/delete an event (e.g. when booking is cancelled)
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const calendar = getCalendarClient()
  await calendar.events.delete({
    calendarId: process.env.GOOGLE_CALENDAR_ID!,
    eventId,
    sendUpdates: 'none', // notifies attendees of cancellation
  })
}