# now    
 
- bug when show backlinks in global, 2 files are not the same =>  duplicate nodes
- bug when forwardlink points to something not exist, causing global not parse
5. change to fap for all map, fap -> full uri is needed
6. graph backlinks toggle GUI
7. showing files despite not exist (as blurred)
3. redesign path resolving logics (to fix desktop bugs) and provide better docs
4. testing  # especially on links parse   

5. backlinks workspace parse # DONE   
6. add ignore node_modules for easier testing  
-> solved by testing on different stuffs #DONE  
## plans ahead    
4. better GUI  
5. Notifications: file read initially,  notify errors  if cant parse one 
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
