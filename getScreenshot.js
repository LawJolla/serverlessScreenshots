const chrome = require(`chrome-aws-lambda`);
const puppeteer = require(`puppeteer-core`);


const preparePageForTests = async (page) => {
  // Pass the User-Agent Test.
  const userAgent =
        `Mozilla/5.0 (X11; Linux x86_64)` +
        `AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.39 Safari/537.36`
  await page.setUserAgent(userAgent)

  // Pass the Webdriver Test.
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, `webdriver`, {
      get: () => false
    })
  })

  // Pass the Chrome Test.
  await page.evaluateOnNewDocument(() => {
    // We can mock this in as much depth as we need for the test.
    // @ts-ignore
    window.navigator.chrome = {
      runtime: {}
      // etc.
    }
  })

  // Pass the Permissions Test.
  await page.evaluateOnNewDocument(() => {
    const originalQuery = window.navigator.permissions.query
    // @ts-ignore
    return (window.navigator.permissions.query = parameters =>
      (parameters.name === `notifications`
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters)))
  })

  // Pass the Plugins Length Test.
  await page.evaluateOnNewDocument(() => {
    // Overwrite the `plugins` property to use a custom getter.
    Object.defineProperty(navigator, `plugins`, {
      // This just needs to have `length > 0` for the current test,
      // but we could mock the plugins too if necessary.
      get: () => [1, 2, 3, 4, 5]
    })
  })

  // Pass the Languages Test.
  await page.evaluateOnNewDocument(() => {
    // Overwrite the `plugins` property to use a custom getter.
    Object.defineProperty(navigator, `languages`, {
      get: () => [`en-US`, `en`]
    })
  })
}

const args = [
  `--no-sandbox`,
  `--disable-setuid-sandbox`,
  `--disable-infobars`,
  `--window-position=0,0`,
  `--ignore-certifcate-errors`,
  `--ignore-certifcate-errors-spki-list`,
  `--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36"`
]


const getScreenshot = async (url, element) => {
  const options = {
    args: [...chrome.args, ...args],
    ignoreHTTPSErrors: true,
    userDataDir: `./tmp`,
    executablePath: await chrome.executablePath,
    headless: chrome.headless
  }
  try {
    console.log(`url`, url)
    const browser = await puppeteer.launch(options)
    const page = await browser.newPage()
    await preparePageForTests(page)
    await page.setViewport({ width: 1000, height: 1000 })
    await page.goto(url, { waitUntil: `networkidle0` })
    console.log(`pageLoaded`)
    await page.waitForSelector(element)
    console.log(`elementFound`)
    // await page.waitForSelector(`img`)
    const area = await page.$(element)
    console.log(`area`)
    if (area) {
      const classNames = await area
        .getProperty(`className`)
        .then(cn => cn.jsonValue())
        .then(classNameString => classNameString.split(` `))
      if (classNames.includes(`isIframe`)) {
        await page.waitForSelector(`iframe`)
        await page.waitFor(2000)
        const frame = await page.frames().find(f => f.url().includes(`youtube`))
        if (frame) {
          console.log(`waiting`)
          await frame.waitForSelector(`.ytp-cued-thumbnail-overlay`)
          await page.waitFor(2000)
        }
      }
      await page.waitFor(1000)
      const clip = await area.boundingBox()
      if (clip) {
        const screenshot = await page.screenshot({
          clip
        })
        await browser.close()
        return screenshot
      }

      await browser.close()
      return null
    }
    // const img = await page.evaluate(() => {
    //   document.querySelector(element)
    // })
    await browser.close()
    return null
  } catch (e) {
    console.log(e)
  }
  return null
}


module.exports = { getScreenshot };
