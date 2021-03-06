(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['exports', 'babel-runtime/core-js/promise', 'babel-runtime/regenerator', 'babel-runtime/helpers/asyncToGenerator', 'cheerio', 'isomorphic-fetch', 'url-parse', './Torrent'], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports, require('babel-runtime/core-js/promise'), require('babel-runtime/regenerator'), require('babel-runtime/helpers/asyncToGenerator'), require('cheerio'), require('isomorphic-fetch'), require('url-parse'), require('./Torrent'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports, global.promise, global.regenerator, global.asyncToGenerator, global.cheerio, global.isomorphicFetch, global.urlParse, global.Torrent);
    global.Parser = mod.exports;
  }
})(this, function (exports, _promise, _regenerator, _asyncToGenerator2, _cheerio, _isomorphicFetch, _urlParse, _Torrent) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.getProxyList = undefined;
  exports._parseTorrentIsVIP = _parseTorrentIsVIP;
  exports._parseTorrentIsTrusted = _parseTorrentIsTrusted;
  exports.isTorrentVIP = isTorrentVIP;
  exports.isTorrentTrusted = isTorrentTrusted;
  exports.parsePage = parsePage;
  exports.parseResults = parseResults;
  exports.parseTvShow = parseTvShow;
  exports.parseTorrentPage = parseTorrentPage;
  exports.parseTvShows = parseTvShows;
  exports.parseCategories = parseCategories;

  var _promise2 = _interopRequireDefault(_promise);

  var _regenerator2 = _interopRequireDefault(_regenerator);

  var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

  var _cheerio2 = _interopRequireDefault(_cheerio);

  var _isomorphicFetch2 = _interopRequireDefault(_isomorphicFetch);

  var _urlParse2 = _interopRequireDefault(_urlParse);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  /**
   * Parse all pages
   * 
   */
  var maxConcurrentRequests = 3;

  function _parseTorrentIsVIP(element) {
    return element.find('img[title="VIP"]').attr('title') === 'VIP';
  }

  function _parseTorrentIsTrusted(element) {
    return element.find('img[title="Trusted"]').attr('title') === 'Trusted';
  }

  function isTorrentVIP(element) {
    return _parseTorrentIsVIP(element);
  }

  function isTorrentTrusted(element) {
    return _parseTorrentIsTrusted(element);
  }

  var getProxyList = exports.getProxyList = function () {
    var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee() {
      var response, $, links;
      return _regenerator2.default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return (0, _isomorphicFetch2.default)('https://proxybay.tv/').then(function (res) {
                return res.text();
              });

            case 2:
              response = _context.sent;
              $ = _cheerio2.default.load(response);
              links = $('[rel="nofollow"]').map(function getElementLinks() {
                return $(this).attr('href');
              }).get().filter(function (res, index) {
                return index < maxConcurrentRequests;
              });
              return _context.abrupt('return', links);

            case 6:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, this);
    }));

    return function getProxyList() {
      return _ref.apply(this, arguments);
    };
  }();

  function parsePage(url, parseCallback) {
    var _this = this;

    var filter = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    var attempt = function () {
      var _ref2 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2(error) {
        var proxyUrls, requests;
        return _regenerator2.default.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (error) console.log(error);

                proxyUrls = ['https://thepiratebay.org', 'https://thepiratebay.se', 'https://pirateproxy.one', 'https://ahoy.one'];
                requests = proxyUrls.map(function (_url) {
                  return new _urlParse2.default(url).set('hostname', new _urlParse2.default(_url).hostname).href;
                }).map(function (_url) {
                  return (0, _isomorphicFetch2.default)(_url, { mode: 'no-cors' });
                });
                return _context2.abrupt('return', _promise2.default.race(requests).then(function (response) {
                  return response.text();
                }));

              case 4:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, _this);
      }));

      return function attempt(_x2) {
        return _ref2.apply(this, arguments);
      };
    }();

    return attempt().then(function (response) {
      return response.includes('Database maintenance') ? attempt('Failed because of db error, retrying') : response;
    }).then(function (response) {
      return parseCallback(response, filter);
    });
  }

  function parseResults(resultsHTML) {
    var filter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    var $ = _cheerio2.default.load(resultsHTML);
    var rawResults = $('table#searchResult tr:has(a.detLink)');

    var results = rawResults.map(function getRawResults() {
      var name = $(this).find('a.detLink').text();
      var uploadDate = $(this).find('font').text().match(/Uploaded\s(?:<b>)?(.+?)(?:<\/b>)?,/)[1];
      var size = $(this).find('font').text().match(/Size (.+?),/)[1];

      var seeders = $(this).find('td[align="right"]').first().text();
      var leechers = $(this).find('td[align="right"]').next().text();
      var relativeLink = $(this).find('div.detName a').attr('href');
      var link = _Torrent.baseUrl + relativeLink;
      var id = parseInt(/^\/torrent\/(\d+)/.exec(relativeLink)[1], 10);
      var magnetLink = $(this).find('a[title="Download this torrent using magnet"]').attr('href');
      var uploader = $(this).find('font .detDesc').text();
      var uploaderLink = _Torrent.baseUrl + $(this).find('font a').attr('href');
      var vip = isTorrentVIP($(this));
      var trusted = isTorrentTrusted($(this));

      var category = {
        id: $(this).find('center a').first().attr('href').match(/\/browse\/(\d+)/)[1],
        name: $(this).find('center a').first().text()
      };

      var subcategory = {
        id: $(this).find('center a').last().attr('href').match(/\/browse\/(\d+)/)[1],
        name: $(this).find('center a').last().text()
      };

      return {
        id: id,
        name: name,
        size: size,
        link: link,
        category: category,
        seeders: seeders,
        leechers: leechers,
        uploadDate: uploadDate,
        magnetLink: magnetLink,
        subcategory: subcategory,
        uploader: uploader,
        vip: vip,
        trusted: trusted,
        uploaderLink: uploaderLink
      };
    });

    var parsedResultsArray = results.get().filter(function (result) {
      return !result.uploaderLink.includes('undefined');
    });

    var out = parsedResultsArray;

    if (filter.vip === true) {
      out = parsedResultsArray.filter(function (result) {
        return result.vip === true;
      });
    }

    if (filter.trusted === true) {
      out = parsedResultsArray.filter(function (result) {
        return result.vip === true;
      });
    }

    return out;
  }

  function parseTvShow(tvShowPage) {
    var _this2 = this;

    var $ = _cheerio2.default.load(tvShowPage);

    var seasons = $('dt a').map(function () {
      return $(_this2).text();
    }).get();

    var rawLinks = $('dd');

    var torrents = rawLinks.map(function (element) {
      return $(_this2).find('a').map(function () {
        return {
          title: element.text(),
          link: _Torrent.baseUrl + element.attr('href'),
          id: element.attr('href').match(/\/torrent\/(\d+)/)[1]
        };
      }).get();
    });

    return seasons.map(function (season, index) {
      return { title: season, torrents: torrents[index] };
    });
  }

  function parseTorrentPage(torrentPage) {
    var $ = _cheerio2.default.load(torrentPage);
    var name = $('#title').text().trim();

    var size = $('dt:contains(Size:) + dd').text().trim();
    var uploadDate = $('dt:contains(Uploaded:) + dd').text().trim();
    var uploader = $('dt:contains(By:) + dd').text().trim();
    var uploaderLink = _Torrent.baseUrl + $('dt:contains(By:) + dd a').attr('href');
    var seeders = $('dt:contains(Seeders:) + dd').text().trim();
    var leechers = $('dt:contains(Leechers:) + dd').text().trim();
    var id = $('input[name=id]').attr('value');
    var link = _Torrent.baseUrl + '/torrent/' + id;
    var magnetLink = $('a[title="Get this torrent"]').attr('href');
    var description = $('div.nfo').text().trim();

    return {
      name: name,
      size: size,
      seeders: seeders,
      leechers: leechers,
      uploadDate: uploadDate,
      magnetLink: magnetLink,
      link: link,
      id: id,
      description: description,
      uploader: uploader,
      uploaderLink: uploaderLink
    };
  }

  function parseTvShows(tvShowsPage) {
    var $ = _cheerio2.default.load(tvShowsPage);
    var rawTitles = $('dt a');

    var series = rawTitles.map(function (element) {
      return {
        title: element.text(),
        id: element.attr('href').match(/\/tv\/(\d+)/)[1]
      };
    }).get();

    var rawSeasons = $('dd');

    var seasons = rawSeasons.map(function (element) {
      return element.find('a').text().match(/S\d+/g);
    });

    return series.map(function (s, index) {
      return { title: s.title, id: s.id, seasons: seasons[index] };
    });
  }

  function parseCategories(categoriesHTML) {
    var $ = _cheerio2.default.load(categoriesHTML);
    var categoriesContainer = $('select#category optgroup');
    var currentCategoryId = 0;

    var categories = categoriesContainer.map(function getElements() {
      currentCategoryId += 100;
      var category = {
        name: $(this).attr('label'),
        id: '' + currentCategoryId,
        subcategories: []
      };

      $(this).find('option').each(function getSubcategory() {
        var subcategory = {
          id: $(this).attr('value'),
          name: $(this).text()
        };

        return category.subcategories.push(subcategory);
      });

      return category;
    });

    return categories.get();
  }
});