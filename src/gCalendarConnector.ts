import { calendar_v3 as CalendarV3, google }  from 'googleapis';

interface GCCProps {
  clientId: string;
  clientSecret: string;
  returnUrl: string;
}

interface GetItemsProps {
  token: string;
  maxResults: number;
  calendarId: string;
}

interface GetAllItemsProps {
  token: string;
  maxResults: number;
  calendarIds: string[];
}

type CalendarEvent = {
  calendar: string;
  end: string;
  fullDay: boolean;
  start: string;
  summary: string;
}

export default class gCalendarConnector {
  clientId: string;
  clientSecret: string;
  returnUrl: string;

  constructor({ clientId, clientSecret, returnUrl }: GCCProps) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.returnUrl = returnUrl;
  }

  private sortByDate(itemA: CalendarEvent, itemB: CalendarEvent): number {
    const dateA = new Date(itemA.start);
    const dateB = new Date(itemB.start);
    if (dateA.valueOf() > dateB.valueOf()) return 1;
    if (dateA.valueOf() < dateB.valueOf()) return -1;
    return 0;
  }

  private getOAuth2Client()  {
    const oAuth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.returnUrl,
    );
    return oAuth2Client;
  }

  public generateAuthUrl(): string {
    const oAuth2Client = this.getOAuth2Client();
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [ 'https://www.googleapis.com/auth/calendar.readonly' ],
    });

    return authUrl;
  }

  public getTokenFromAuthCode(authCode: string): Promise<string> {
    return new Promise((res, rej) => {
      const oAuth2Client = this.getOAuth2Client();
      oAuth2Client.getToken(authCode, (err, token) => {
        if (err) rej(err);
        res(Buffer.from(JSON.stringify(token)).toString('base64'));
      });
    });
  }

  private getItemsForCalendar({
    token,
    maxResults,
    calendarId,
  }: GetItemsProps): Promise<CalendarEvent[]> {
    return new Promise((resolve, reject) => {
      /* Promisified Callback for Google Calendar's list */
      const handleCalendarResponse = (
        error: Error,
        response: { data: CalendarV3.Schema$Events },
      ) => {
        if (error) reject(error);

        const events: CalendarV3.Schema$Event[] = response.data.items || [];
        const mappedEvents: CalendarEvent[] = events.map(event => ({
          calendar: event.organizer.displayName || '',
          end: event.end.dateTime || event.end.date,
          fullDay: !event.start.dateTime,
          start: event.start.dateTime || event.start.date,
          summary: event.summary,
        }));

        resolve(mappedEvents);
      };

      const oAuth2Client = this.getOAuth2Client();
      const stringToken: string = Buffer.from(token, 'base64').toString('utf-8');
      oAuth2Client.setCredentials(JSON.parse(stringToken));
      const calendar: CalendarV3.Calendar = google.calendar({
        version: 'v3',
        auth: oAuth2Client,
      });

      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(now.getDate() + 1);

      calendar.events.list({
        calendarId,
        maxResults,
        orderBy: 'startTime',
        singleEvents: true,
        timeMax: tomorrow.toISOString(),
        timeMin: now.toISOString(),
      }, handleCalendarResponse);
    });
  }

  public async getCalendarItems({ token, maxResults, calendarIds }: GetAllItemsProps) {
    const promisePerCalendar = calendarIds.map(calendarId => {
      return this.getItemsForCalendar({ calendarId, maxResults, token });
    });
    const calendarResults = await Promise.all(promisePerCalendar);
    return calendarResults
      .reduce((acc, val) => acc.concat(val), [])
      .sort(this.sortByDate);
  }
}
