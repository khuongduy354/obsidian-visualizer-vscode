# now      

- events in web(production) not worked: probably due to web 
- delete events untested

- lag when large connected node
-> connection force too strong 


- events in Desktop worked: 
-> add auto rerendering graph webview 



 
4. testing  # especially on links parse   


5. Notfications: file read initially,  notify errors  if cant parse one 
4. Attachments handling 
-> parse it back (currently ignore ![[...]]) 
-> fix link resolver (move it out of extractForwardLinks)



## plans ahead      
3. Search text in workspaces: grep is not supported in vscode api (stably)

- Included, Excluded folders, Attachment folders   
-> Exclude is a bug in vscode, which works in desktop but not in browser...
7. tiny stuffs 
- text below 
- bolder/bigger with more connections 
- orphans toggle setting 
8. tagging 
3. embed text from link

# Working features  
### on web only 
- Show global graph 
- Show local graph forward links + backwardlinks
- Force reparse 
- Link resolve given a filename
- GUI 
    - highlighted when mouse over a node 
    - toggle forward links
    - showing files despite not exist (as blurred)    
- Search (global graph only)
    - filename: shows nodes + its back/forward links where filename.contains("keyword") 
    - path: shows nodes + its back/forward links where path.contains("keyword")  
    - default: filename    

# backlog 
- bug on desktop version -> link  
- bug initial read -> show read 0 files but when run global graph, it still working  
-> in obsitracker.readallworkspacefiles, use promise.all instead to check for error

# Design   

+ Flow 
Read workspace at start  
Graph parse on that workspace
Events: File changes -> Workspace read that file -> Graph reparse all  
Files -> Obsi -> Neo (graph json)

+ Link resolver component 
- given a filename -> resolve full path, null if not resolveable  
- if 2 file same name (different path), then pick 1 by default (that's how obsidian handle), apply for both backlinks and forwardlinks

+ Obsi Data strucutre - representing obsidian file strucutre (use filename as idx) 
fap = file absolute path, contains path starting from root workspace   (start with /)
obsifile = fap + full uri
- fap -> obsifile
- fap -> forward links (obsifile[])
- fap -> backward links (obsifile[])


+ Parsing neo 
<!-- + When to parse / update above data structure  (performance issue) 
- cache tree to file (if possible on vscode) 
- parsing whole tree on startup, interval (while parsing, use previous cache tree), 
-> since relying on mostly events is risky -->
### non-exist file  
- it's not exist in forwardLinks keys, only exist in forwarLinks value   
- blurred in graph 
- should i give an id to it ? Yes, no collided with an existed one, because it's not existed 


+ cross-Platform 
to read files, different plats have different uris, so added a URihandler class to detect workspace uri, any later uri is based on that. 
graph class only works on filepath, independent of uri 
 

+ FORMATS  
**web**
folder.uri.path = "/"  # read from root
folderUri = uriHandler.getFullURI(folder.uri.path)
result: {
    "$mid": 1,
    "fsPath": "/",
    "external": "vscode-test-web://mount/",
    "path": "/",
    "scheme": "vscode-test-web",
    "authority": "mount"
}  

baseWorkspaceURI = 
{
    "$mid": 1,
    "fsPath": "/",
    "external": "vscode-test-web://mount/",
    "path": "/",
    "scheme": "vscode-test-web",
    "authority": "mount"
} 

--> Web every file object is just relative path, so an append to base path is needed (relative = true in uriHandler)

**desktop**
folder.uri.path = "/some/absolute/path"  # read from root, desktop has extra components compared to web 

{$mid: 1, path: '/home/khuongduy354/assets/obsidian-git-notes/home/khuongduy354/assets/obsidian-git-notes', scheme: 'file'}


baseWorkspaceURI 
{$mid: 1, fsPath: '/home/khuongduy354/assets/obsidian-git-notes', external: 'file:///home/khuongduy354/assets/obsidian-git-notes', path: '/home/khuongduy354/assets/obsidian-git-notes', scheme: 'file'}

--> Desktop every file object includes absolute path, so relative must be disable in uriHandler or else that base absolute path will be duplicated 

