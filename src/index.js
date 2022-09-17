const axios = require('axios');
const cheerio = require('cheerio');
const nodemailer = require('nodemailer');
const { from, merge } = require('rxjs');
const { map, mergeAll, filter, toArray } = require('rxjs/operators');
require('dotenv').config();

const sendEmail = async html => {
  try {
    let transporter = nodemailer.createTransport({
      service: 'hotmail',
      auth: {
        user: process.env.SCRAPER_USERNAME,
        pass: process.env.SCRAPER_PASSWORD,
      },
    });

    // setup email data with unicode symbols
    let mailOptions = {
      from: process.env.SCRAPER_USERNAME, // sender address
      to: process.env.SCRAPER_TARGET_EMAIL, // list of receivers
      subject: 'Games in stock!', // Subject line
      html,
    };

    // send mail with defined transport object
    let info = await transporter.sendMail(mailOptions);

    console.log('Message sent: %s', html, info.messageId);
  } catch (e) {
    console.error(e);
  }
};

const createEmail = inStockUrls => {
  return `<ul>${inStockUrls.reduce((string, url) => {
    return `${string}<li><a href="${url}">${url}</a></li>`;
  }, '')}</ul>`;
};

const gamesLoreUrls = [];

const ffgSKUs = [];

const bgExtrasUrls = ['https://www.bgextras.co.uk/star-wars-imperial-assault-i2123.htm'];

const isResponseSuccessful = response => response.status === 200 && Boolean(response.data);
const areItemsAvailable = items => items.length > 0;

const isItemInStockOnGamesLore = html => {
  const $ = cheerio.load(html);
  return !$('img[src="v8outofstock.gif"]').length;
};

const isItemInStockOnFfg = responseData => responseData['in_stock'] === 'available';

const isItemOnSaleOnBgExtras = html => {
  const $ = cheerio.load(html);
  const priceElement = $('#ROC_itemprice');
  const inStock = !!$('.ROC_vp_itemaddtocartenabled');

  if (!priceElement || !inStock) {
    console.log('Not available on bgextras');
    return false;
  }

  const price = Number(priceElement.text().replace(/[^\d.-]/g, ''));

  return price < 81;
};

// GamesLore scraper stream
const gamesLore$ = from(gamesLoreUrls).pipe(
  map(url => from(axios.get(url))),
  mergeAll(),
  filter(response => isResponseSuccessful(response) && isItemInStockOnGamesLore(response.data)),
  map(inStockResponse => inStockResponse.config.url),
  toArray()
);

// FFG API consumer stream
const ffgApi$ = from(ffgSKUs).pipe(
  map(({ sku, url }) =>
    from(
      axios.get(`https://shop.fantasyflightgames.com/api/v1/stockrecord/${sku}/level/`, {
        responseType: 'json',
        transformResponse: data => Object.assign({}, JSON.parse(data), { sku, url }),
      })
    )
  ),
  mergeAll(),
  filter(response => isResponseSuccessful(response) && isItemInStockOnFfg(response.data)),
  map(inStockResponse => inStockResponse.data.url),
  toArray()
);

// GamesLore scraper stream
const bgExtras$ = from(bgExtrasUrls).pipe(
  map(url => from(axios.get(url))),
  mergeAll(),
  filter(response => isResponseSuccessful(response) && isItemOnSaleOnBgExtras(response.data)),
  map(inStockResponse => inStockResponse.config.url),
  toArray()
);

const mergedStreams$ = merge(gamesLore$, ffgApi$, bgExtras$);
mergedStreams$.subscribe(
  inStockUrls => areItemsAvailable(inStockUrls) && sendEmail(createEmail(inStockUrls))
);
