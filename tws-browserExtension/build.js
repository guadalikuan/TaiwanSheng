const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// 创建dist目录
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
}

// 复制文件到dist目录
const filesToCopy = [
    'manifest.json',
    'popup.html',
    'popup.css',
    'popup.js',
    'content.js',
    'content.css',
    'background.js',
    'test.html'
];

filesToCopy.forEach(file => {
    const sourcePath = path.join(__dirname, file);
    const destPath = path.join(distDir, file);
    
    if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`✓ 复制文件: ${file}`);
    } else {
        console.log(`✗ 文件不存在: ${file}`);
    }
});

// 复制icons目录
const iconsSource = path.join(__dirname, 'icons');
const iconsDest = path.join(distDir, 'icons');

if (fs.existsSync(iconsSource)) {
    if (!fs.existsSync(iconsDest)) {
        fs.mkdirSync(iconsDest);
    }
    
    const iconFiles = fs.readdirSync(iconsSource);
    iconFiles.forEach(file => {
        const sourcePath = path.join(iconsSource, file);
        const destPath = path.join(iconsDest, file);
        fs.copyFileSync(sourcePath, destPath);
        console.log(`✓ 复制图标: ${file}`);
    });
}

// 创建ZIP包
const output = fs.createWriteStream(path.join(distDir, 'tws-extension.zip'));
const archive = archiver('zip', {
    zlib: { level: 9 }
});

output.on('close', function() {
    console.log(`✓ 插件打包完成: ${archive.pointer()} 字节`);
    console.log('✓ 插件文件已保存到: dist/tws-extension.zip');
    console.log('\n📦 插件包含以下文件:');
    console.log('├── manifest.json');
    console.log('├── popup.html');
    console.log('├── popup.css');
    console.log('├── popup.js');
    console.log('├── content.js');
    console.log('├── content.css');
    console.log('├── background.js');
    console.log('├── icons/');
    console.log('└── test.html');
    console.log('\n🚀 安装说明:');
    console.log('1. 打开Chrome浏览器');
    console.log('2. 进入 chrome://extensions/');
    console.log('3. 开启"开发者模式"');
    console.log('4. 点击"加载已解压的扩展程序"');
    console.log('5. 选择 dist 目录');
});

archive.on('error', function(err) {
    throw err;
});

archive.pipe(output);

// 添加文件到ZIP包
filesToCopy.forEach(file => {
    if (fs.existsSync(path.join(__dirname, file))) {
        archive.file(path.join(__dirname, file), { name: file });
    }
});

// 添加icons目录
if (fs.existsSync(iconsSource)) {
    archive.directory(iconsSource, 'icons');
}

archive.finalize();