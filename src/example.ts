import dotenv from 'dotenv';

import Connector from './gCalendarConnector';

dotenv.config();

const _connector = new Connector({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  returnUrl: process.env.RETURN_URL,
});

(async () => {
  try {
    const items = await _connector.getCalendarItems({
      calendarIds: process.env.CALENDAR_IDS.split(';'),
      maxResults: 50,
      token: process.env.EXAMPLE_TOKEN,
    });
    console.log(JSON.stringify(items, null, 2));
  } catch(e) {
    console.error(e);
  }
})();
