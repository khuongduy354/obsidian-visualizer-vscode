# obsidian-visualizer  
 
Providing core obsidian features in VSCode: graphs, backlinks,...

VSCode marketplace: [Obsidian Visualizer](https://marketplace.visualstudio.com/items?itemName=khuongduy354.obsidian-visualizer)

## Features 

- Local graph: open a markdown file, Command Pallete > Show Local Graph 
- Global graph: Command Pallette > Show Global graph 

**Note**: it will included all markdown files recursively starting from the root directory of current workspace


![global graph demo](images/demo_dark.png)

## Run from source 
### Web 
```js 
npm run watch-web  
npm run run-in-browser //another terminal 
``` 

### VSCode Desktop (run from VSCode)
Press F5 or  Command Pallete >Debug: Start Debugging 


## Release Notes 

### 1.0.0

- Initial release of obsidian visualizer
- Local & Global graph rendering.

