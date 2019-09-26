const { parse } = require(`url`);
const { getScreenshot } = require(`./getScreenshot`);

function getUrlFromPath(str) {
  const url = str.slice(1);
  if (!url.startsWith(`http`)) {
    return `https://${url}`;
  }
  return url;
}

const screenshot = async (req, res) => {
  try {
    const { element, url } = req.query
    console.log(req.query)
    if (!element || !element.length) throw new Error(`element not provided`)
    if (!url || !url.length) throw new Error(`url not provided`)
    const file = await getScreenshot(url, element);
    res.statusCode = 200;
    res.setHeader(`Content-Type`, `image/png`);
    res.end(file);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader(`Content-Type`, `text/html`);
    res.end(`<h1>Server Error</h1><p>Sorry, there was a problem</p>`);
    console.error(e.message);
  }
};

module.exports = screenshot
