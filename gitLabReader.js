
foldersToSearch = Array();
filesToProcess = Array();

//http://code.evolio.cz/api/v4/projects/evolio%2Fefilters/repository/tree?path=EFilters.ViewModels/ViewModel
//url: code.evolio.cz
//project: evolio%2Fefilters
async function getAllFiles(url, project, branch){
    let treeUrl = 'https://' + url + '/api/v4/projects/' + project + '/repository/';

    let key = url + "/" + project + "/" + branch;
    let request = new Request(treeUrl + 'tree?per_page=100');
    let response = await fetch(request,{mode:"cors" ,credentials: "include",  headers: {Accept: 'application/json', 'Content-Type': 'application/json',}})
    let json = await response.json();

    window.postMessage({ type: "FROM_PAGE", data: {id: "classParsingStarted", notificationId: url, message: "Parsing started"}});
    for (element in json) {
        sortItem(json[element]);
    }
    while(foldersToSearch.length != 0){
        await searchFolders(treeUrl + 'tree', foldersToSearch.pop());
    }
    for (id in filesToProcess) {
        let p = Math.trunc( (id / filesToProcess.length) * 100 );
        //console.log(p);
        //console.log(classes.length);
        if (p % 10 === 0) {
            window.postMessage({ type: "FROM_PAGE", data: {id: "classParsingUpdate", notificationId: url, progress:p, message: "Found " + classes.length + " classes!"}});
        }
        await processFile(treeUrl + 'blobs', filesToProcess[id]);
    }
    var a = 5;
    //console.log(classes);
    //console.log(contexts);
    
    formatedClasses = [];
    for (const cl of classes) {
        formatedClasses.push({name: cl.name, fullName: getFullName(cl), url: getURL(cl, url, project, branch), line: cl.line });
    }
    console.log(formatedClasses);
    //chrome.runtime.sendMessage("phicehfclmfgkellhdcegnkibnnjaifl", {id: "saveClasses", key: url + "/" + project + "/" + branch, classes: JSON.stringify(formatedClasses)});
    window.postMessage({ type: "FROM_PAGE", data: {id: "saveClasses", key: key, classes: JSON.stringify(formatedClasses)} },"*");
    window.postMessage({ type: "FROM_PAGE", data: {id: "classParsingStoped", notificationId: url}},"*");
    window.postMessage({ type: "FROM_PAGE", data: {id: "classParsingDone", notificationId: url+"_D"}},"*");
}

function getFullName(cl) {
    if (cl.contextParent === undefined) {
        return cl.name;
    }else{
        return getFullName(cl.contextParent) + "." + cl.name;
    }

}

function getURL(cl, url, project, branch) {
    return url + "/" + project.replace("%2F", "/") + "/blob/" + branch + "/" + cl.fileName;
}

function sortItem(item){
    if(item.type == "blob"){
        filesToProcess.push(item);
    }
    else if(item.type == "tree"){
        foldersToSearch.push(item);
    }
}

async function searchFolders(url, folder){
    var more = true;
    var page = 1;
    while(more){
        let treeUrl = url + '?path=' + folder.path + "&per_page=100&page=" + page;
        page++;
        let request = new Request(treeUrl);
        let response = await fetch(request,{mode:"cors" ,credentials: "include",  headers: {Accept: 'application/json', 'Content-Type': 'application/json'}})
        let json = await response.json();
        more = json.length == 100;
        for (var element of json) {
            sortItem(element);
        }
    }
}

var blackListedExtensions = [".ico", ".gitattributes", ".gitignore", ".config", ".docx", ".ttf", ".licx", ".xaml", ".sln", ".csproj", ".zip"];

async function processFile(url, file){
    for (const extension of blackListedExtensions) {
        if(file.path.endsWith(extension)){
            return;
        }
    }
    let treeUrl = url + '/' + file.id;
    let request = new Request(treeUrl);
    //console.log(file);
    let response = await fetch(request,{mode:"cors" ,credentials: "include",  headers: {Accept: 'application/json', 'Content-Type': 'application/json'}})
    let json = await response.json();
    let text = b64DecodeUnicode(json.content);
    if(file.path.endsWith(".cs"))
    {
        await getClasses(file.path, text)
    }
}

///from----https://stackoverflow.com/questions/30106476/using-javascripts-atob-to-decode-base64-doesnt-properly-decode-utf-8-strings
function b64DecodeUnicode(str) {
    return decodeURIComponent(Array.prototype.map.call(atob(str), function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    }).join(''))
}



//getAllFiles("code.evolio.cz","evolio%2Fefilters");