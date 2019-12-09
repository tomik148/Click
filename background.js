chrome.runtime.onInstalled.addListener(function() {
    //chrome.storage.sync.set({color: '#3aa757'}, function() {
    //console.log('The color is green.');
    //});
    
  chrome.webNavigation.onCommitted.addListener(async function(ev) {
    var host = new URL(ev.url);
    if (!(host.href.startsWith( "http://") || host.href.startsWith( "https://"))) {
      return;
    }
    if (host.host === new URL("https://github.com/").host) {
      isGitHub = true;
      chrome.tabs.executeScript(ev.tabId, { file: 'gitHubReader.js' });
      chrome.tabs.executeScript(ev.tabId, { file: 'csParser.js' });
      return;
    }
    if (/https?:\/\/.*?\/(.*)\/(blob|tree)\/(.*?)(?:\/|$)/.test(ev.url)) {
      isGitLab = true;
      let res = ev.url.match(/https?:\/\/.*?\/(.*)\/(blob|tree)\/(.*?)(?:\/|$)/);
      //0: "https://code.evolio.cz/evolio/edata/tree/master"
      //1: "evolio/edata" - reporitory
      //2: "tree" - tree or blob
      //3: "master" - branch
      let reporitory = res[1];
      reporitory = reporitory.replace("/", "%2F");

      let key = host.host + "/" + reporitory + "/" + res[3];

      chrome.storage.local.get(key,async (ob)=>{
        console.log(ob);
        if (Object.keys(ob).length === 0 && ob.constructor === Object) {
          await chrome.tabs.executeScript(ev.tabId, { file: 'messagePasser.js', runAt: "document_start" });
          await chrome.tabs.executeScript(ev.tabId, { code: injectJsFile('gitLabReader.js'), runAt: "document_start" });
          await chrome.tabs.executeScript(ev.tabId, { code: injectJsFile('csParser.js') , runAt: "document_start" });
          await chrome.tabs.executeScript(ev.tabId, { code: injectCode('getAllFiles("' + host.host + '", "' + reporitory + '", "' + res[3] + '");'), runAt: "document_idle" });
        }
        else{
          if (res[2] === "blob") {
            await chrome.tabs.executeScript(ev.tabId, { code: injectCode('formatedClasses = ' + JSON.stringify(ob[key]) + ';'), runAt: "document_start" });
            await chrome.tabs.executeScript(ev.tabId, { code: injectJsFile('gitLabWriter.js') , runAt: "document_start" });
            getStyle((style)=>{
              chrome.tabs.executeScript(ev.tabId, { code: injectStyle(style, "cStyle") , runAt: "document_start" });
            });
            await chrome.tabs.executeScript(ev.tabId, { code: injectCode('runNew()') , runAt: "document_idle" });
          }
        }
      });


    }
    /*
    var versionCheck = new URL('/api/v4/version', host.origin); 
    try {
      let resp = await fetch(versionCheck.href);
      if(resp.ok) {
        return resp.json().then((json)=>{ 
          var a = json; 
          isGitLab = true; 
          chrome.tabs.executeScript(ev.tabId, { file: 'gitLabReader.js' });
          chrome.tabs.executeScript(ev.tabId, { file: 'csParser.js' });
        })
        .catch((e)=>{ 
          return;  
        }); ;
      }
    } catch (error) {
      console.log(error);
      
    }
    */
    return;
    var b = 5;
  });

  function injectJsFile(fileName) {
    return "var s = document.createElement('script');" +
           "s.src = chrome.runtime.getURL('" + fileName + "');"+
           "(document.head || document.documentElement).appendChild(s);";
  }
  function injectCssFile(fileName) {
    return "var s = document.createElement('link');" +
           "s.rel='stylesheet';s.href = chrome.runtime.getURL('" + fileName + "');"+
           "(document.head || document.documentElement).appendChild(s);";
  }
  function injectCode(code) {
    return "var s = document.createElement('script');" +
           "s.text = '" + code + "';"+
           "(document.head || document.documentElement).appendChild(s);";
  }
  function injectFileAndCode(fileName, code) {
    return "var s1 = document.createElement('script'); var s2 = document.createElement('script');" +
           "s1.src = chrome.runtime.getURL('" + fileName + "');"+"s2.text = '" + code + "';"+
           "(document.head || document.documentElement).appendChild(s1);" + "(document.head || document.documentElement).appendChild(s2);";
  }

  function injectStyle(style, id) {
    return "var style = document.createElement('style');" + 
           "style.id = '" + id + "';" + 
           "style.type = 'text/css';" + 
           "style.innerHTML = '" + style + "';" +
           "(document.head || document.documentElement).appendChild(style);"
  }

  function getStyle(callback){
    var ccColor = "pink";
    var acColor = "blue";
    var hcColor = "lightblue";
    chrome.storage.sync.get(["cc","ac","hc"], (vals)=>{
      if (vals.hasOwnProperty("cc")) {
        ccColor = vals.cc;
      }    
      if (vals.hasOwnProperty("ac")) {
        acColor = vals.ac;
      } 
      if (vals.hasOwnProperty("hc")) {
        hcColor = vals.hc;
      } 
      var cc = ".custom-class{ color: " + ccColor + " !important; } "   
      var ac = ".custom-link{ color: " + acColor + " !important; cursor: pointer !important; text-decoration: underline !important; } "   
      var hc = ".custom-link:hover{ color: " + hcColor + " !important; cursor: pointer !important; text-decoration: underline !important; } "   
      callback(cc + ac + hc);
    });
  }

  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
      chrome.declarativeContent.onPageChanged.addRules([{
        conditions: [new chrome.declarativeContent.PageStateMatcher({
        //   pageUrl: {schemes: 'developer.chrome.com'},
        })],
            actions: [new chrome.declarativeContent.ShowPageAction()]
      }]);
  });

  //    host          /repository    /branch
  //key:code.evolio.cz/evolio%2Fedata/master
  chrome.runtime.onMessage.addListener(
    async function(message, sender, sendResponse) {
      if (message.id == "saveClasses"){
        let a = {};
        a[message.key] = JSON.parse(message.classes)
        chrome.storage.local.set(a, function() { });
        //await chrome.tabs.executeScript({ code: injectJsFile('gitLabWriter.js') , runAt: "document_start" });
        //await chrome.tabs.executeScript({ code: injectCssFile('clickCss.css') , runAt: "document_start" });
        //await chrome.tabs.executeScript({ code: injectCode('runNew()') , runAt: "document_end" });
      }
      if (message.id == "clearCache"){
        if (confirm('Opravdu chcete smazat Cache?')) {
          chrome.storage.local.clear();
        } else {}
      }
      if (message.id == "changeColors"){
          message.cc !== "" ? chrome.storage.sync.set({cc: message.cc}) : chrome.storage.sync.remove("cc");
          message.ac !== "" ? chrome.storage.sync.set({ac: message.ac}) : chrome.storage.sync.remove("ac");
          message.hc !== "" ? chrome.storage.sync.set({hc: message.hc}) : chrome.storage.sync.remove("hc");
      }
      if (message.id == "classParsingStarted"){
        chrome.notifications.clear(message.notificationId,(a)=>console.log(a));
        chrome.notifications.create(message.notificationId, {type:"progress", title:"Click", iconUrl:"icon-128.png", message: message.message, priority: 2, progress:0, requireInteraction: true},(a)=>console.log(a));
      }
      if (message.id == "classParsingStoped"){
        //console.log("CLEAR!!!!!!");
        //console.log(message.notificationId);
        chrome.notifications.clear(message.notificationId,(a)=>console.log(a));
      }
      if (message.id == "classParsingUpdate"){
        //console.log(message.notificationId);
        console.log(message.message);
        console.log(message.progress);
        
        chrome.notifications.update(message.notificationId, {message: message.message, progress:message.progress},(a)=>console.log(a));
      }
      if (message.id == "classParsingDone"){
        chrome.notifications.clear(message.notificationId,(a)=>console.log(a));
        chrome.notifications.create(message.notificationId, {type:"basic", title:"Click", iconUrl:"icon-128.png", message: "Done", priority: 2},(a)=>console.log(a));
      }

  });
});
/*
chrome.runtime.onMessage.addListener(
  function(message, callback) {
    if (message.id == "loadCsParser"){
      chrome.tabs.executeScript({
        file: 'csParser.js'
      });
    }
});
*/


  //search for namespaces
  //inside namespace set context to namespace
  //search for clases
  //save inside class for later
  //---search for params, fealds, methods (enums)
  //save class