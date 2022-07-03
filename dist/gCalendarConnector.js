"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const googleapis_1 = require("googleapis");
class gCalendarConnector {
    constructor({ clientId, clientSecret, returnUrl }) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.returnUrl = returnUrl;
    }
    sortByDate(itemA, itemB) {
        const dateA = new Date(itemA.start);
        const dateB = new Date(itemB.start);
        if (dateA.valueOf() > dateB.valueOf())
            return 1;
        if (dateA.valueOf() < dateB.valueOf())
            return -1;
        return 0;
    }
    getOAuth2Client() {
        const oAuth2Client = new googleapis_1.google.auth.OAuth2(this.clientId, this.clientSecret, this.returnUrl);
        return oAuth2Client;
    }
    generateAuthUrl() {
        const oAuth2Client = this.getOAuth2Client();
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/calendar.readonly'],
        });
        return authUrl;
    }
    getTokenFromAuthCode(authCode) {
        return new Promise((res, rej) => {
            const oAuth2Client = this.getOAuth2Client();
            oAuth2Client.getToken(authCode, (err, token) => {
                if (err)
                    rej(err);
                res(Buffer.from(JSON.stringify(token)).toString('base64'));
            });
        });
    }
    getItemsForCalendar({ token, maxResults, calendarId, }) {
        return new Promise((resolve, reject) => {
            const handleCalendarResponse = (error, response) => {
                if (error)
                    reject(error);
                const events = response.data.items || [];
                const mappedEvents = events.map(event => ({
                    calendar: event.organizer.displayName || '',
                    end: event.end.dateTime || event.end.date,
                    fullDay: !event.start.dateTime,
                    start: event.start.dateTime || event.start.date,
                    summary: event.summary,
                }));
                resolve(mappedEvents);
            };
            const oAuth2Client = this.getOAuth2Client();
            const stringToken = Buffer.from(token, 'base64').toString('utf-8');
            oAuth2Client.setCredentials(JSON.parse(stringToken));
            const calendar = googleapis_1.google.calendar({
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
    getCalendarItems({ token, maxResults, calendarIds }) {
        return __awaiter(this, void 0, void 0, function* () {
            const promisePerCalendar = calendarIds.map(calendarId => {
                return this.getItemsForCalendar({ calendarId, maxResults, token });
            });
            const calendarResults = yield Promise.all(promisePerCalendar);
            return calendarResults
                .reduce((acc, val) => acc.concat(val), [])
                .sort(this.sortByDate);
        });
    }
}
exports.default = gCalendarConnector;
