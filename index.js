const puppeteer = require('puppeteer');
const fs = require('fs');
const { resourceUsage } = require('process');
   (async () => {
      // ブラウザを起動する
      const browser = await puppeteer.launch();
      // タブを一個得る
      const [page] = await browser.pages();
      // cookieを指定してログイン状態にする
      let cookieJSON = fs.readFileSync('./twitter-cookie.json');
      let cookie = JSON.parse(cookieJSON);
      page.setCookie(...cookie);
      // request interceptionを有効化する
      await page.setRequestInterception(true);
      let tweets = {};
      page.on('response', async (response)=>{
        try {
          if (response.url().indexOf("https://api.twitter.com/2/timeline/profile/") >= 0
            || response.url().indexOf("https://api.twitter.com/2/timeline/favorites/") >= 0
            || response.url().indexOf("https://api.twitter.com/2/search/adaptive.json") >= 0){
            console.debug('getTweetsFromResponse')
            const text = await response.text();
            const json = JSON.parse(text);
            if(json && json.globalObjects){
              Object.assign(tweets, json.globalObjects.tweets);
            }
          }
        } catch (error) {
          
        }
      });
      let authorization;
      let csrfToken;
      //const tweet_id = "1299625727612973056";
      const tweet_id = "1296357649798139905";
      page.on('request', async (request) => {
        try {
          if (request.url().indexOf("https://api.twitter.com/2/timeline/profile/") >= 0
          || request.url().indexOf("https://api.twitter.com/2/timeline/favorites/") >= 0
          || request.url().indexOf("https://api.twitter.com/2/search/adaptive.json") >= 0){
            authorization = request.headers()['authorization'];
            csrfToken = request.headers()['x-csrf-token'];
            console.log("authorization: "+authorization);
            console.log("csrfToken: "+csrfToken);
            request.continue();
            return;
          }
          if(tweet_id !== "" && request.url().indexOf("https://api.twitter.com/1.1/statuses/destroy.json") > -1){
            var data = {
              'headers': {'authorization': authorization, 'x-csrf-token': csrfToken},
              'method': 'POST',
              'postData': 'tweet_mode=extended&id='+tweet_id
            };
            request.continue(data);
            return;
          }
          request.continue();
        } catch (error) {
          
        }
    });
      // URLを指定して開く
      await page.goto('https://twitter.com/nil_yade', {waitUntil: 'networkidle2'});
      // ツイートを出力する
      console.log(tweets);
      const response = await page.goto('https://api.twitter.com/1.1/statuses/destroy.json');
      console.log(response.status);
      console.log(await response.text())

      // ブラウザを閉じる
      browser.close();
   })();