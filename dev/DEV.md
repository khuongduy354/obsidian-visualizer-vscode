# now    
 
4. testing  # especially on links parse   
4. better GUI  
- toggle backward links
- highlighted when mouse over a node, one color for backlinks, one color for forwards 
5. Notifications: file read initially,  notify errors  if cant parse one 

## plans ahead    
5. search
6. clear todos

- Attachments handling
- Included, Excluded folders, Attachment folders   
-> Exclude is a bug in vscode, which works in desktop but not in browser...

# Working features  
### on web only 
- Show global graph 
- Show local graph forward links + backwardlinks
- Force reparse 
- Link resolve
- GUI 
    - toggle forward links
    - showing files despite not exist (as blurred)    DONE 

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
frp = file relative path  
obsifile = frp + full uri
- fap -> obsifile
- fap -> forward links = obsifile[]
- fap -> backward links = obsifile[]


+ Parsing neo 
<!-- + When to parse / update above data structure  (performance issue) 
- cache tree to file (if possible on vscode) 
- parsing whole tree on startup, interval (while parsing, use previous cache tree), 
-> since relying on mostly events is risky -->


+ cross-Platform 
to read files, different plats have different uris, so added a URihandler class to detect workspace uri, any later uri is based on that. 
graph class only works on filepath, independent of uri 
