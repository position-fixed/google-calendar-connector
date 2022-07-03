interface GCCProps {
    clientId: string;
    clientSecret: string;
    returnUrl: string;
}
interface GetAllItemsProps {
    token: string;
    maxResults: number;
    calendarIds: string[];
}
declare type CalendarEvent = {
    calendar: string;
    end: string;
    fullDay: boolean;
    start: string;
    summary: string;
};
export default class gCalendarConnector {
    clientId: string;
    clientSecret: string;
    returnUrl: string;
    constructor({ clientId, clientSecret, returnUrl }: GCCProps);
    private sortByDate;
    private getOAuth2Client;
    generateAuthUrl(): string;
    getTokenFromAuthCode(authCode: string): Promise<string>;
    private getItemsForCalendar;
    getCalendarItems({ token, maxResults, calendarIds }: GetAllItemsProps): Promise<CalendarEvent[]>;
}
export {};
