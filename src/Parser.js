/**
 * Parse all pages
 * @flow
 */
import cheerio from 'cheerio';
import fetch from 'isomorphic-fetch';
import UrlParse from 'url-parse';
import { baseUrl } from './Torrent';


const maxConcurrentRequests = 3;

export function _parseTorrentIsVIP(element: Object) {
  return (
    element.find('img[title="VIP"]').attr('title') === 'VIP'
  );
}

export function _parseTorrentIsTrusted(element: Object) {
  return (
    element.find('img[title="Trusted"]').attr('title') === 'Trusted'
  );
}

export function isTorrentVIP(element: Object) {
  return _parseTorrentIsVIP(element);
}

export function isTorrentTrusted(element: Object) {
  return _parseTorrentIsTrusted(element);
}

export async function getProxyList() {
  const response = await fetch('https://proxybay.tv/')
    .then(res => res.text());

  const $ = cheerio.load(response);

  const links = $('[rel="nofollow"]').map(function getElementLinks() {
    return $(this).attr('href');
  })
  .get()
  .filter((res, index) => (index < maxConcurrentRequests));

  return links;
}

export function parsePage(url: string, parseCallback, filter: Object = {}) {
  const attempt = async error => {
    if (error) console.log(error);

    const proxyUrls = [
      'https://thepiratebay.org',
      'https://thepiratebay.se',
      'https://pirateproxy.one',
      'https://ahoy.one'
    ];

    const requests = proxyUrls
      .map(_url => (new UrlParse(url)).set('hostname', new UrlParse(_url).hostname).href)
      .map(_url => fetch(_url, { mode: 'no-cors' }));

    return Promise.race(requests).then(response => response.text());
  };

  return attempt()
    .then(response => (
      response.includes('Database maintenance')
        ? (attempt('Failed because of db error, retrying'))
        : response
    ))
    .then(response => parseCallback(response, filter));
}

export function parseResults(resultsHTML: string, filter: Object = {}) {
  const $ = cheerio.load(resultsHTML);
  const rawResults = $('table#searchResult tr:has(a.detLink)');

  const results = rawResults.map(function getRawResults() {
    const name = $(this).find('a.detLink').text();
    const uploadDate = $(this).find('font').text()
      .match(/Uploaded\s(?:<b>)?(.+?)(?:<\/b>)?,/)[1];
    const size = $(this).find('font').text()
      .match(/Size (.+?),/)[1];

    const seeders = $(this).find('td[align="right"]').first().text();
    const leechers = $(this).find('td[align="right"]').next().text();
    const relativeLink = $(this).find('div.detName a').attr('href');
    const link = baseUrl + relativeLink;
    const id = parseInt(/^\/torrent\/(\d+)/.exec(relativeLink)[1], 10);
    const magnetLink = $(this).find('a[title="Download this torrent using magnet"]').attr('href');
    const uploader = $(this).find('font .detDesc').text();
    const uploaderLink = baseUrl + $(this).find('font a').attr('href');
    const vip = isTorrentVIP($(this));
    const trusted = isTorrentTrusted($(this));

    const category = {
      id: $(this)
            .find('center a')
            .first()
            .attr('href')
            .match(/\/browse\/(\d+)/)[1],
      name: $(this).find('center a').first().text()
    };

    const subcategory = {
      id: $(this)
            .find('center a')
            .last()
            .attr('href')
            .match(/\/browse\/(\d+)/)[1],
      name: $(this).find('center a').last().text()
    };

    return {
      id,
      name,
      size,
      link,
      category,
      seeders,
      leechers,
      uploadDate,
      magnetLink,
      subcategory,
      uploader,
      vip,
      trusted,
      uploaderLink
    };
  });

  const parsedResultsArray =
    results
      .get()
      .filter(result => !result.uploaderLink.includes('undefined'));

  var out = parsedResultsArray;

  if (filter.vip === true) {
    out = parsedResultsArray.filter(result => result.vip === true);
  }

  if (filter.trusted === true) {
    out = parsedResultsArray.filter(result => result.vip === true);
  }

  return out;
}

export function parseTvShow(tvShowPage: string) {
  const $ = cheerio.load(tvShowPage);

  const seasons = $('dt a').map(() => $(this).text()).get();

  const rawLinks = $('dd');

  const torrents = rawLinks.map(element =>
    $(this).find('a').map(() => ({
      title: element.text(),
      link: baseUrl + element.attr('href'),
      id: element.attr('href').match(/\/torrent\/(\d+)/)[1]
    }))
    .get()
  );

  return seasons.map(
    (season, index) => ({ title: season, torrents: torrents[index] })
  );
}

export function parseTorrentPage(torrentPage: string) {
  const $ = cheerio.load(torrentPage);
  const name = $('#title').text().trim();

  const size = $('dt:contains(Size:) + dd').text().trim();
  const uploadDate = $('dt:contains(Uploaded:) + dd').text().trim();
  const uploader = $('dt:contains(By:) + dd').text().trim();
  const uploaderLink = baseUrl + $('dt:contains(By:) + dd a').attr('href');
  const seeders = $('dt:contains(Seeders:) + dd').text().trim();
  const leechers = $('dt:contains(Leechers:) + dd').text().trim();
  const id = $('input[name=id]').attr('value');
  const link = `${baseUrl}/torrent/${id}`;
  const magnetLink = $('a[title="Get this torrent"]').attr('href');
  const description = $('div.nfo').text().trim();

  return {
    name,
    size,
    seeders,
    leechers,
    uploadDate,
    magnetLink,
    link,
    id,
    description,
    uploader,
    uploaderLink
  };
}

export function parseTvShows(tvShowsPage) {
  const $ = cheerio.load(tvShowsPage);
  const rawTitles = $('dt a');

  const series = rawTitles.map(
    (element) => ({
      title: element.text(),
      id: element.attr('href').match(/\/tv\/(\d+)/)[1]
    }))
    .get();

  const rawSeasons = $('dd');

  const seasons = rawSeasons.map(
    element => element.find('a').text().match(/S\d+/g)
  );

  return series.map(
    (s, index) => ({ title: s.title, id: s.id, seasons: seasons[index] })
  );
}

export function parseCategories(categoriesHTML) {
  const $ = cheerio.load(categoriesHTML);
  const categoriesContainer = $('select#category optgroup');
  let currentCategoryId = 0;

  const categories = categoriesContainer.map(function getElements() {
    currentCategoryId += 100;
    const category = {
      name: $(this).attr('label'),
      id: `${currentCategoryId}`,
      subcategories: []
    };

    $(this).find('option').each(function getSubcategory() {
      const subcategory = {
        id: $(this).attr('value'),
        name: $(this).text()
      };

      return category.subcategories.push(subcategory);
    });

    return category;
  });

  return categories.get();
}
