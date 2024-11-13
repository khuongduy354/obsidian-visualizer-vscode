# obsidian-visualizer  
 
Providing core obsidian features in VSCode: graphs, backlinks,...

VSCode marketplace: [Obsidian Visualizer](https://marketplace.visualstudio.com/items?itemName=khuongduy354.obsidian-visualizer)
![global graph demo](images/demo_dark.png)
## Features 

- Local graph: open a markdown file, Command Pallete > Show Local Graph 
- Global graph: Command Pallette > Show Global graph 
- Force reparse: Command Pallette > Force workspace parse
- Link resolve given a filename or a path
- GUI 
    - highlighted when mouse over a node 
    - toggle forward links, backlinks
    - showing non-exist files (as blurred)    
- Search (global graph only) 
    - filename: <keyword>          (starts search with filename:)
    - path: <keyword>              (starts search with path:)

**Note**: it will included all markdown files recursively starting from the root directory of current workspace, multiple workspace not supported




## Run from source 
### Web 
```js 
npm run watch-web  
npm run run-in-browser //another terminal 
``` 

### VSCode Desktop (run from VSCode)
Press F5 or  Command Pallete >Debug: Start Debugging 


## Release Notes 

### 1.1.1 
 
- Remove relative links 

### 1.1.0 

- Desktop supports 

### 1.0.0

- Initial release of obsidian visualizer
- Local & Global graph rendering.
- Decent GUI: toggle links, highlightings nodes
- Search with filename and path
- Only for web version
