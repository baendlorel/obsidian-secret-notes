这个项目是从obsidian-liuyao的插件复制来的，目的是快速基于同样的配置新建一个新插件
名为obsidian-secret-notes。它的功能是：
1. 对于代码块
```secret
<要加密的文本>
```
会自动将其加密，但是密码会弹窗让用户输入。输入后，`<要加密的文本>`这一部分就会被替换为一个json
这个json的格式如`draft/secret.json`所示。
2. 加密后，这个代码块会被渲染为一个div，上面写着已加密字样，并有一个解密按钮。
3. 点击解密后，会弹窗输入密码，密码正确则显示解密后内容。
4. 在文件被保存之前，则会再次自动以先前的密码加密。
请你先说说你对需求的理解

---

规整样式：
1. 对于plainblock额外增加一个样式。这个样式内容样式：
```css
  color: var(--text-warning);
  fill: var(--text-warning);
  background: color-mix(in srgb, var(--text-warning) 14%, transparent);
``` 
确保未加密的block及其内部文字、背景都是黄色主题。也让水印样式也被包裹在这一样式下

---
我又做了一些修改，请你基于现在的代码实现对edit里的textarea的搜索机制：1、这个搜索框在按下ctrl+f后，会在textarea的右上方出现，也就是说它是一个positionabsolute的、平常hidden的输入组；2、这个输入组有一个输入框和上下两个按钮。输入关键字后，会跳转到textarea里出现该关键字的位置，上下按钮则表示前一个和后一个。3、输入关键字后，要显示出a/b，a是当前是第几个，b是总共多少个。每次点击上下按钮或者关键字变化，都会重新计算总数和现在是第几个。4、写入searcher.ts，这个文件我已经新建好

---

修正问题：
1、在搜索框输入的时候，会直接focus到textarea里的对应位置。这是没有必要的，因为我完全可能还要继续输入关键词。
2、不需要快捷键，只保留ctrl+f和esc
3、在textarea右上角加一个半透明的放大镜图标。图标在src/assets/search.svg。请你把这个图标先按照icons.ts那样做成export const searchIcon，再进一步使用