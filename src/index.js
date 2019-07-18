const axios = require('axios');
const cheerio = require('cheerio');
const nodemailer = require('nodemailer');
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
      subject: 'LotR items in stock!', // Subject line
      html,
    };

    // send mail with defined transport object
    let info = await transporter.sendMail(mailOptions);

    console.log('Message sent: %s', info.messageId);
  } catch (e) {
    console.error(e);
  }
};

const createEmail = inStockUrls => {
  return `<ul>${inStockUrls.reduce((string, url) => {
    return `${string}<li><a href="${url}">${url}</a></li>`;
  }, '')}</ul>`;
};

const isItemInStock = html => {
  const $ = cheerio.load(html);
  return !$('img[src="v8outofstock.gif"]').length;
};

const urls = [
  'https://www.gameslore.com/acatalog/PR_The_Lord_Of_The_Rings_LCG_The_Redhorn_Gate_Adventure_Pack.html',
  'https://www.gameslore.com/acatalog/PR_The_Lord_Of_The_Rings_LCG_Shadow_And_Flame_Adventure_Pack.html',
  'https://www.gameslore.com/acatalog/PR_The_Lord_Of_The_Rings_LCG_Foundations_Of_Stone_Adventure_Pack.html',
  'https://www.gameslore.com/acatalog/PR_The_Lord_Of_The_Rings_LCG_The_Long_Dark_Adventure_Pack.html',
  'https://www.gameslore.com/acatalog/PR_The_Lord_Of_The_Rings_LCG_The_Watcher_In_The_Water_Adventure_Pack.html',
  'https://www.gameslore.com/acatalog/PR_The_Lord_Of_The_Rings_LCG_Road_To_Rivendell_Adventure_Pack.html',
  'https://www.gameslore.com/acatalog/PR_The_Lord_Of_The_Rings_LCG_The_Hobbit_On_The_Doorstep_Saga_Expansion.html',
  'https://www.gameslore.com/acatalog/PR_The_Lord_Of_The_Rings_LCG_Voice_of_Isengard_Expansion.html',
  'https://www.gameslore.com/acatalog/PR_The_Lord_Of_The_Rings_LCG_The_Stewards_Fear_Adventure_Pack.html',
  'https://www.gameslore.com/acatalog/PR_The_Lord_Of_The_Rings_LCG_Flight_Of_The_Stormcaller_Adventure_Pack.html',
  'https://www.gameslore.com/acatalog/PR_The_Lord_Of_The_Rings_LCG_Temple_Of_The_Deceived_Adventure_Pack.html',
  'https://www.gameslore.com/acatalog/PR_The_Lord_Of_The_Rings_LCG_The_Morgul_Vale_Adventure_Pack.html',
  'https://www.gameslore.com/acatalog/PR_The_Lord_Of_The_Rings_LCG_Assault_On_Osgiliath_Adventure_Pack.html',
  'https://www.gameslore.com/acatalog/PR_The_Lord_Of_The_Rings_LCG_The_Wilds_Of_Rhovanion_Expansion.html',
  'https://www.gameslore.com/acatalog/PR_The_Lord_Of_The_Rings_LCG_The_Mumakil_Adventure_Pack.html',
  'https://www.gameslore.com/acatalog/PR_The_Lord_Of_The_Rings_LCG_Race_Across_Harad_Adventure_Pack.html',
  'https://www.gameslore.com/acatalog/PR_The_Lord_Of_The_Rings_LCG_Beneath_The_Sands_Adventure_Pack.html',
  'https://www.gameslore.com/acatalog/PR_The_Lord_Of_The_Rings_LCG_The_Black_Serpent_Adventure_Pack.html',
];

const ffgSKUs = [
  {
    sku: 'MEC24',
    url:
      'https://www.fantasyflightgames.com/en/products/the-lord-of-the-rings-the-card-game/products/the-hobbit-on-the-doorstep/',
  },
  {
    sku: 'MEC65',
    url:
      'https://www.fantasyflightgames.com/en/products/the-lord-of-the-rings-the-card-game/products/wilds-rhovanion/',
  },
  {
    sku: 'MEC09',
    url:
      'https://www.fantasyflightgames.com/en/products/the-lord-of-the-rings-the-card-game/products/the-redhorn-gate-1',
  },
  {
    sku: 'MEC10',
    url:
      'https://www.fantasyflightgames.com/en/products/the-lord-of-the-rings-the-card-game/products/road-to-rivendell',
  },
  {
    sku: 'MEC11',
    url:
      'https://www.fantasyflightgames.com/en/products/the-lord-of-the-rings-the-card-game/products/the-watcher-in-the-water',
  },
  {
    sku: 'MEC12',
    url:
      'https://www.fantasyflightgames.com/en/products/the-lord-of-the-rings-the-card-game/products/the-long-dark-1',
  },
  {
    sku: 'MEC13',
    url:
      'https://www.fantasyflightgames.com/en/products/the-lord-of-the-rings-the-card-game/products/foundations-of-stone-1',
  },
  {
    sku: 'MEC14',
    url:
      'https://www.fantasyflightgames.com/en/products/the-lord-of-the-rings-the-card-game/products/shadow-and-flame-1',
  },
];

const htmlPromises = urls.map(url => axios.get(url));

Promise.all(htmlPromises).then(responses => {
  const itemsInStock = responses.reduce((items, response) => {
    if (response.status !== 200) {
      return items;
    }

    if (!isItemInStock(response.data)) {
      return items;
    }

    return [...items, response.config.url];
  }, []);

  if (itemsInStock.length) {
    console.log('There are items in stock!');
    sendEmail(createEmail(itemsInStock));
  }
});

const apiPromises = ffgSKUs.map(({ sku }) =>
  axios.get(`https://shop.fantasyflightgames.com/api/v1/stockrecord/${sku}/level/`)
);

Promise.all(apiPromises).then(responses => {
  const itemsInStock = responses.reduce((items, response) => {
    if (response.status !== 200) {
      return items;
    }

    if (response.data['in_stock'] !== 'available') {
      return items;
    }

    return [...items, ffgSKUs.find(({ sku }) => sku === response.data['product_code']).url];
  }, []);

  if (itemsInStock.length) {
    console.log('There are items in stock!');
    sendEmail(createEmail(itemsInStock));
  }
});
