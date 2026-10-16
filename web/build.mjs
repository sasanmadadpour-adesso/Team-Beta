import {build,context} from 'esbuild';
const options={entryPoints:['src/App.jsx'],bundle:true,outfile:'public/app.js',minify:true,define:{'process.env.NODE_ENV':'"production"'},loader:{'.css':'css','.png':'dataurl','.svg':'dataurl'}};
if(process.argv.includes('--watch')){const ctx=await context(options);await ctx.watch();console.log('React watch active');}else await build(options);
