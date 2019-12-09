
classes = [];
contexts = [];

const contextTypes = Object.freeze({"NameSpace":1, "Class":2, "Method":3, "Property":4, "Field":5, "Enum":6, "Interface":7})


async function getClasses(fileName, fileText) 
{
    if(fileName.endsWith(".cs"))
    {
        let formatedfileText = removeStrings(fileText); 
        formatedfileText = removeComents(formatedfileText);
        formatedfileText = removeUsings(formatedfileText);

        //const regex = /class (\w+)/g;

        var rootContexts = await getContexts(formatedfileText, undefined);
        for (const index in rootContexts) {
            rootContexts[index].fileName = fileName;
            processContext(rootContexts[index]);
        }

        if (rootContexts.length > 1) {
           var a = 5;
        }
    }
    
}

async function processContext(context) 
{
    let add = true;
    if (context.type === contextTypes.NameSpace) {
        for (const cont of contexts) {
            if (cont.identifier === context.identifier) {
                add = false;
            }
        }
        if (add) {
            contexts.push(context);
        }
    }

    if (context.type === contextTypes.Class || context.type === contextTypes.NameSpace) 
    {
        if (context.type === contextTypes.Class) {
            classes.push(context);
        }
        let Contexts = await getContexts(context.body, context);
        //contexts.concat(Contexts);
        for (const index in Contexts) {
            Contexts[index].fileName = context.fileName;
            processContext(Contexts[index]);
        }
    }
}

async function getContexts(text, contextParent) 
{
    var last = 0;
    var identifier = "";
    var identifierLine = 0;

    var start = 0;
    var depth = 0;

    var line = 0;
    var Contexts = [];

    for (let index = 0; index < text.length; index++) 
    {
        if(text[index] === '\n')
        {
            line++;
        }
        if(text[index] === '{')
        {
            depth++;
            if(start === 0)
            {
                start = index + 1;
                identifier = text.substring(last, index-1).trim();
                identifierLine = line-1;//:(
            }
        }
        if(text[index] === '}')
        {
            depth--;
            if(depth === 0)
            {
                let parent;

                if (contextParent !== undefined && contexts.filter(c => c.identifier === contextParent.identifier).length > 0) {
                    parent = contexts.filter(c => c.identifier === contextParent.identifier)[0];
                }
                else{
                    parent = contextParent;
                }
                if (!(identifier.trim().startsWith("=") || identifier.trim() === "")) {
                    let context = {identifier: identifier.trim(), line: identifierLine, body: text.substring(start, index-1), contextParent: parent, childeren: []};
                    context.type = await getContextType(context);
                    context.name = await getName(context);
                    if (parent !== undefined) {
                        parent.childeren.push(context);
                        context.line += parent.line;
                    }
                    Contexts.push(context);
                }   
                start = 0;
                last = index + 1;
            }
        }
        if(text[index] === ';')
        {
            if(depth === 0)
            {
                let parent;

                if (contextParent !== undefined && contexts.filter(c => c.identifier === contextParent.identifier).length > 0) {
                    parent = contexts.filter(c => c.identifier === contextParent.identifier)[0];
                }
                else{
                    parent = contextParent;
                }
                identifier = text.substring(last, index).trim();
                if (!(identifier.startsWith("=") || identifier === "")) {
                    let field = {identifier: identifier, line: line, contextParent: parent, type: contextTypes.Field};
                    if (identifier.includes("=>")) {
                        field.body = identifier.split("=>")[1].trim();
                        field.identifier = identifier.split("=>")[0].trim();

                        field.type = contextTypes.Property;
                        if (field.identifier.includes("(")) {
                            field.type = contextTypes.Method;
                        }

                    }
                    if (identifier.includes("abstract")) {
                        if (identifier.includes("(")) {
                            field.type = contextTypes.Method;
                        }

                    }
                    field.name = await getName(field);
                    if (parent !== undefined) {
                        if (parent.childeren === undefined){
                            parent.childeren = [];
                        }
                        field.line += parent.line;
                        parent.childeren.push(field);
                    }
                }
                last = index + 1;
            }
        }
    }
    return Contexts;
}

function removeComents(fileText)
{
    const regex = /\/\*.*?\*\/|\/\/.*?$/gsm;
    return fileText.replace(regex, "");
}

function removeStrings(fileText)
{
    const regex = /".*?"/gs;
    return fileText.replace(regex, "\"\"");
}

function removeUsings(fileText)
{
    const regex = /using .*?;/g;
    return fileText.replace(regex, "");
}

async function getContextType(context) 
{
    if (context.contextParent === undefined) 
    {
        if (context.identifier.toLowerCase().includes("namespace ")) 
        {
            return contextTypes.NameSpace;
        }
    }

    if (context.contextParent === undefined || context.contextParent.type === contextTypes.NameSpace) 
    {
        if (context.identifier.toLowerCase().includes("class ")) 
        {
            return contextTypes.Class;
        }

        if (context.identifier.toLowerCase().includes("interface ")) 
        {
            return contextTypes.Interface;
        }

        if (context.identifier.toLowerCase().includes("enum ")) 
        {
            return contextTypes.Enum;
        }
    }

    if (context.contextParent.type === contextTypes.Class) 
    {
        if (context.identifier.toLowerCase().includes("class ")) 
        {
            return contextTypes.Class;
        }

        if (context.identifier.toLowerCase().includes("interface ")) 
        {
            return contextTypes.Interface;
        }

        if (context.identifier.toLowerCase().includes("enum ")) 
        {
            return contextTypes.Enum;
        }
        //if (/(?<=(?:(?:protected)|(?:public)|(?:private)) *(?:\w+ )* *)\w+(?= *[(])/g.test(context.identifier.toLowerCase()))
        //if (/(?<!new) \w+(?=(?:(<[^>]+?>))? *[(])/g.test(context.identifier.toLowerCase()))
        if (/\w+(?=(?:<[^>]+?>)?[(])/g.test(context.identifier.toLowerCase()))
        
        {
            return contextTypes.Method;
        }
        if (context.identifier.toLowerCase().includes("=")) 
        {
            return contextTypes.Field;
        }
        return contextTypes.Property;
    }
    return undefined;
}

async function getName(context) 
{
    if (context.type === contextTypes.Class) 
    {
        const regex = /(?<=class )\w*/;
        return context.identifier.match(regex)[0];
    }
    if (context.type === contextTypes.NameSpace) 
    {
        const regex = /(?<=namespace )[\w.]*/;
        return context.identifier.match(regex)[0];
    }
    if (context.type === contextTypes.Method) 
    {
        const regex = /\w+(?=(?:<[^>]+?>)?[(])/;
        return context.identifier.match(regex)[0];
    }
    if (context.type === contextTypes.Property) 
    {
        const regex = /\w+(?:\[.*?\])?$/sm;
        return context.identifier.match(regex)[0];
    }
    if (context.type === contextTypes.Field) 
    {
        const regex = /\w+(?= ?=)|(?<=delegate.* )\w+(?=\(.*?\))|\w+$/m;
        return context.identifier.match(regex)[0];
    }
    if (context.type === contextTypes.Enum) 
    {
        const regex = /(?<=enum )\w*/;
        return context.identifier.match(regex)[0];
    }
    if (context.type === contextTypes.Interface) 
    {
        const regex = /(?<=interface )\w*/;
        return context.identifier.match(regex)[0];
    }
    return context.identifier;
}