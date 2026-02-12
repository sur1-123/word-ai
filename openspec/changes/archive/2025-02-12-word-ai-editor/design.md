# Design: Word AI Editor

## 上下文

### 当前状态

这是一个全新的桌面应用项目，目标是为 Word 文档编辑提供 AI 增强的用户体验。

### 约束条件

| 约束类别 | 具体限制 |
|----------|----------|
| **性能** | 空闲内存 <100MB，大文件编辑 <500MB |
| **响应时间** | 小文件 (<10MB) <1s 打开，大文件分块加载 |
| **跨平台** | 支持 Windows/macOS/Linux |
| **文件大小** | 支持 500MB+ 的 Word 文档 |
| **代码规范** | 单文件 <250 行，单文件夹 <8 个文件 |

### 利益相关者

- **终端用户**: 需要高效处理大型 Word 文档的专业人士
- **AI 模型**: 通过 MCP 协议调用文档操作
- **开发者**: 需要清晰的模块边界和可维护的代码结构

---

## 目标 / 非目标

### 目标

1. **构建跨平台桌面应用**，提供流畅的文档编辑体验
2. **实现 MCP 服务器**，使 AI 能够通过标准化协议操作文档
3. **支持大文件流式处理**，避免内存溢出和界面卡顿
4. **提供智能排版功能**，自动化常见格式调整任务
5. **模块化架构**，确保代码可维护性和可扩展性

### 非目标

- ❌ 替代 Microsoft Word（专注于特定场景的增强）
- ❌ 支持所有 Word 格式特性（专注于常用功能）
- ❌ 实时协作编辑（单机应用）
- ❌ 云端同步（本地文件操作）
- ❌ 完整的文档格式转换（专注于 DOCX）

---

## 决策

### 1. 桌面框架选择：Tauri 2.0

**决策**: 使用 Tauri 而非 Electron

**理由**:

| 指标 | Tauri | Electron | 差异 |
|------|-------|----------|------|
| 空闲内存 | ~40MB | ~200MB | **80% 减少** |
| 启动时间 | <500ms | ~2s | **4x 更快** |
| 安装包大小 | ~3MB | ~150MB | **98% 减少** |
| 安全性 | Rust 内存安全 | Chromium 漏洞风险 | **更安全** |

**替代方案考虑**:
- **Electron**: 成熟生态，但资源占用过高
- **Flutter Desktop**: Google 支持，但 Web 集成复杂
- **Native (Qt)**: 性能最优，但开发周期长

---

### 2. 前端-后端通信架构

**决策**: 使用 Tauri Commands + Python 子进程通信

```
┌─────────────────────────────────────────────────────────────┐
│                      用户界面层                            │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐ │
│  │  Monaco编辑器   │  │   AI对话面板   │  │  文件浏览器  │ │
│  └───────┬───────┘  └───────┬───────┘  └──────┬──────┘ │
└──────────┼──────────────────┼──────────────────┼─────────┘
           │                  │                  │
           └──────────────────┴──────────────────┘
                          │
                  ┌───────▼───────┐
                  │  Rust Bridge   │  (Tauri Commands)
                  └───────┬───────┘
                          │
                  ┌───────▼───────┐
                  │ Python Service │  (WebSocket / stdio)
                  └───────┬───────┘
                          │
    ┌─────────────────────┼─────────────────────┐
    │                     │                     │
┌───▼────────┐    ┌──────▼──────┐    ┌──────▼──────┐
│docx_processor│  │streaming.py  │  │mcp_tools.py  │
└─────────────┘    └─────────────┘    └─────────────┘
```

**理由**:
- **Tauri Commands**: 前端与 Rust 间类型安全通信
- **Python 子进程**: 复用成熟的 python-docx 生态
- **独立服务**: Python 服务可独立测试和复用

**替代方案**:
- **纯 Rust 实现**: 需要重写所有文档处理逻辑，开发成本高
- **Node.js 中间层**: 增加 JavaScript 依赖，不如 Python 生态丰富

---

### 3. 大文件处理策略

**决策**: 分块加载 + 虚拟化渲染

```
DOCX 文件 (500MB+)
        │
        ▼
┌───────────────────┐
│  ZIP 解析器      │  DOCX 本质是 ZIP 格式
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  document.xml     │  ← 主文档内容
│  styles.xml      │  ← 样式定义
│  settings.xml    │  ← 文档设置
└─────────┬─────────┘
          │
          ▼
┌─────────────────────────────┐
│  SAX 流式解析器            │  逐段解析，不加载全文
└─────────┬───────────────────┘
          │
          ▼
    ┌─────┴─────┐
    │           │
┌───▼───┐  ┌──▼────┐
│可见页 │  │缓存区 │  只渲染可见区域
└───────┘  └───────┘
```

**核心策略**:
1. **SAX 解析**: 使用 `xml.sax` 逐节点解析，避免 DOM 全量加载
2. **分页加载**: 按页/节分块，仅加载当前可视区域
3. **增量编辑**: 只保存修改的部分，而非整个文档
4. **内存池**: 限制解析器内存使用，超出则释放

**代码结构**:

```python
# python/streaming.py (不超过 200 行)
class StreamingDocxParser:
    """流式 DOCX 解析器，支持大文件处理"""

    MAX_MEMORY_MB = 100  # 硬性内存限制

    def parse_chunk(self, start_para: int, count: int) -> List[Paragraph]:
        """解析指定范围的段落"""

    def get_paragraph_count(self) -> int:
        """获取文档总段落数"""

    def apply_edit(self, para_index: int, new_content: str) -> None:
        """应用增量编辑"""
```

---

### 4. MCP 服务器设计

**决策**: 独立 MCP 服务器，通过 stdio 与 AI 对话

```
┌─────────────────────────────────────────────────────────┐
│                    Claude Desktop                      │
└───────────────────────┬─────────────────────────────┘
                        │ stdio / JSON-RPC
                        ▼
┌─────────────────────────────────────────────────────────┐
│              MCP Server (Python)                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Tools (工具集)                               │  │
│  │  ├── document_read()      # 读取文档内容        │  │
│  │  ├── document_write()     # 写入文档            │  │
│  │  ├── format_paragraph()   # 格式化段落          │  │
│  │  ├── add_table()         # 添加表格            │  │
│  │  ├── insert_image()      # 插入图片            │  │
│  │  ├── smart_format()      # 智能排版            │  │
│  │  ├── batch_replace()    # 批量替换            │  │
│  │  └── ... (20+ tools)                         │  │
│  └─────────────────────────────────────────────────┘  │
│                         │                             │
│                         ▼                             │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Word Document Service (python-docx)            │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**工具清单** (至少 20 种):

| 分类 | 工具名称 | 功能描述 |
|------|----------|----------|
| **基础读写** | `document_read` | 读取文档全部或部分内容 |
| | `document_write` | 保存文档到指定路径 |
| | `document_create` | 创建新文档 |
| | `document_info` | 获取文档元信息（页数、字数等） |
| **内容操作** | `add_paragraph` | 在指定位置添加段落 |
| | `replace_text` | 替换文本（支持正则） |
| | `delete_paragraph` | 删除指定段落 |
| | `move_paragraph` | 移动段落到新位置 |
| **格式化** | `format_paragraph` | 设置段落样式（字体、对齐、缩进） |
| | `apply_heading` | 应用标题样式（H1-H6） |
| | `set_font` | 设置字体属性（粗体、斜体、颜色） |
| | `apply_style` | 应用自定义样式 |
| **表格操作** | `add_table` | 插入表格 |
| | `format_table` | 格式化表格（边框、底色） |
| | `merge_cells` | 合并单元格 |
| **图片操作** | `insert_image` | 插入图片 |
| | `resize_image` | 调整图片大小 |
| **智能功能** | `smart_format` | AI 智能排版 |
| | `batch_operation` | 批量执行操作 |
| | `optimize_document` | 优化文档（清理冗余样式、压缩图片） |

---

### 5. 代码组织结构

**决策**: 按领域分模块，严格控制文件大小

```
word-ai/
├── src-tauri/                     # Rust 后端
│   ├── src/
│   │   ├── commands/              # Tauri 命令 (每个文件 <200 行)
│   │   │   ├── mod.rs
│   │   │   ├── document.rs       # 文档操作命令
│   │   │   ├── mcp.rs           # MCP 服务器控制
│   │   │   └── file.rs          # 文件系统访问
│   │   ├── services/             # 服务层
│   │   │   ├── mod.rs
│   │   │   ├── python_bridge.rs # Python 子进程通信
│   │   │   └── window.rs       # 窗口管理
│   │   └── main.rs
│   └── Cargo.toml
│
├── src/                          # React 前端
│   ├── components/
│   │   ├── editor/               # 编辑器模块
│   │   │   ├── MonacoEditor.tsx
│   │   │   ├── DocumentView.tsx
│   │   │   └── FormattingToolbar.tsx
│   │   ├── ai/                  # AI 功能
│   │   │   ├── AIChatPanel.tsx
│   │   │   ├── PromptInput.tsx
│   │   │   ├── VersionControlPanel.tsx  # 版本控制面板
│   │   │   └── Timeline.tsx         # 历史时间线
│   │   ├── layout/               # 布局组件
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── StatusBar.tsx
│   │   └── file/                # 文件操作
│   │       ├── FileTree.tsx
│   │       └── RecentFiles.tsx
│   ├── hooks/                    # 自定义 Hooks
│   │   ├── useDocument.ts
│   │   ├── useMCP.ts
│   │   └── useStreaming.ts
│   ├── services/                 # API 服务
│   │   └── tauri.ts
│   └── App.tsx
│
├── python/                       # Python 服务
│   ├── docx/                    # 文档处理 (每个文件 <200 行)
│   │   ├── __init__.py
│   │   ├── reader.py            # 读取文档
│   │   ├── writer.py            # 写入文档
│   │   ├── formatter.py         # 格式化操作
│   │   ├── tables.py            # 表格操作
│   │   └── images.py           # 图片操作
│   ├── streaming/               # 流式处理
│   │   ├── __init__.py
│   │   ├── parser.py           # SAX 解析器
│   │   ├── chunk.py            # 分块管理
│   │   └── cache.py            # 缓存策略
│   ├── history/                # 版本控制（新增）
│   │   ├── __init__.py
│   │   ├── models.py           # 数据模型
│   │   ├── manager.py          # 历史管理器
│   │   ├── storage.py          # SQLite 存储
│   │   └── snapshot.py         # 快照管理
│   ├── mcp/                    # MCP 服务器
│   │   ├── __init__.py
│   │   ├── server.py           # MCP 服务器主逻辑
│   │   ├── tools.py            # 工具注册
│   │   └── schemas.py          # 请求/响应模型
│   └── main.py                 # 服务入口
│
└── mcp-config/                  # MCP 配置
    └── word-ai-server.json      # Claude Desktop 配置
```

**文件夹大小控制**:

| 文件夹 | 文件数 | 说明 |
|--------|--------|------|
| `src-tauri/src/commands/` | ≤ 8 | 超出则按领域拆分子文件夹 |
| `src/components/editor/` | ≤ 8 | 超出则按功能分组 |
| `python/docx/` | ≤ 8 | 按操作类型分组 |
| `python/history/` | ≤ 8 | 按职责分组 |
| `python/mcp/` | ≤ 8 | 按职责分组 |

---

### 6. AI 操作历史与版本管理

**决策**: Git 风格的版本控制系统，支持分支回退和持久化

```
┌─────────────────────────────────────────────────────────────────┐
│                      操作历史管理器                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  历史记录 (SQLite + 增量存储)                      │   │
│  │                                                   │   │
│  │  ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐        │   │
│  │  │ op1 │───→│ op2 │───→│ op3 │───→│ op4 │        │   │
│  │  │     │    │     │    │     │    │     │        │   │
│  │  │ HEAD│    │     │    │branch│    │     │        │   │
│  │  └──┬──┘    └──┬──┘    └──┬──┘    └─────┘        │   │
│  └─────┼──────────┼─────────┼───────────────────────     │   │
│        │          │         │                          │   │
│  ┌─────▼──────────▼─────────▼──────────────────────┐     │   │
│  │  版本切换引擎                                   │     │   │
│  │  ├── checkout(version_id)                       │     │   │
│  │  ├── create_branch(name, from_version)           │     │   │
│  │  ├── merge(source_branch, target_branch)         │     │   │
│  │  └── compare(version1, version2)               │     │   │
│  └──────────────────┬──────────────────────────────┘     │   │
└───────────────────┼───────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼────────┐    ┌──────▼──────┐
│  内存快照       │    │  磁盘存储   │
│  (当前版本)     │    │  (历史记录) │
└────────────────┘    └─────────────┘
```

#### 6.1 数据结构设计

```python
# python/history/models.py (不超过 200 行)
from dataclasses import dataclass
from typing import Optional, List
from enum import Enum

class OperationType(Enum):
    """操作类型枚举"""
    FORMAT = "format"           # 格式化操作
    REPLACE = "replace"         # 替换操作
    INSERT = "insert"           # 插入操作
    DELETE = "delete"           # 删除操作
    MOVE = "move"              # 移动操作
    BATCH = "batch"             # 批量操作

@dataclass
class DocumentOperation:
    """单个文档操作记录"""
    id: str                     # 操作唯一 ID
    type: OperationType         # 操作类型
    timestamp: float           # 时间戳
    ai_prompt: str             # AI 原始指令
    changes: dict             # 变更内容（增量）
    parent_id: Optional[str]   # 父操作 ID（形成链表）

@dataclass
class DocumentVersion:
    """文档版本（可能包含多个操作）"""
    id: str                     # 版本 ID
    branch: str               # 分支名称
    operations: List[str]     # 操作 ID 列表
    created_at: float        # 创建时间
    message: str             # 版本描述（自动生成）
    snapshot_hash: str        # 文档快照哈希（用于验证）

@dataclass
class Branch:
    """版本分支"""
    name: str                  # 分支名称
    head_version_id: str       # HEAD 版本 ID
    created_at: float         # 创建时间
    parent_branch: Optional[str]  # 父分支
```

#### 6.2 存储策略

| 存储类型 | 内容 | 保留期限 | 位置 |
|----------|------|----------|------|
| **内存快照** | 当前工作版本的完整状态 | 应用生命周期 | 内存 |
| **增量操作** | 每次操作的变更内容 | 永久（可配置清理） | SQLite |
| **定期快照** | 每 N 次操作后的完整文档 | 永久 | 文件系统 |
| **元数据** | 版本、分支、操作关系 | 永久 | SQLite |

**磁盘布局**:

```
~/.word-ai/
├── history/
│   ├── operations.db          # SQLite 数据库（元数据）
│   └── snapshots/           # 完整快照
│       ├── v1_abc123.docx   # 版本 1 快照
│       ├── v5_def456.docx   # 版本 5 快照
│       └── v10_ghi789.docx  # 版本 10 快照
└── cache/
    └── temp/                # 临时文件
```

#### 6.3 核心功能实现

```python
# python/history/manager.py (不超过 200 行)
class HistoryManager:
    """操作历史管理器"""

    SNAPSHOT_INTERVAL = 10    # 每 10 次操作创建一次快照
    MAX_HISTORY_DAYS = 30      # 历史保留天数

    def __init__(self, db_path: str, snapshot_dir: str):
        self.db = SQLiteDB(db_path)
        self.snapshot_dir = snapshot_dir
        self.current_branch = "main"
        self.head_version_id = None

    def record_operation(self, operation: DocumentOperation) -> str:
        """记录一次 AI 操作"""
        # 1. 保存操作到数据库
        op_id = self.db.insert_operation(operation)
        # 2. 将操作添加到当前版本
        self.db.add_operation_to_version(self.head_version_id, op_id)
        # 3. 检查是否需要创建快照
        if self._should_snapshot():
            self._create_snapshot()
        return op_id

    def create_branch(self, branch_name: str, from_version: str = None) -> str:
        """创建新分支"""
        from_version = from_version or self.head_version_id
        branch_id = self.db.create_branch(branch_name, from_version)
        return branch_id

    def switch_branch(self, branch_name: str) -> DocumentVersion:
        """切换到指定分支"""
        branch = self.db.get_branch(branch_name)
        self.current_branch = branch_name
        self.head_version_id = branch.head_version_id
        return self._load_version(branch.head_version_id)

    def get_history_timeline(self, branch: str = None) -> List[DocumentVersion]:
        """获取历史时间线（用于 UI 展示）"""
        return self.db.get_versions(branch or self.current_branch)

    def rollback_to(self, version_id: str) -> Document:
        """回退到指定版本"""
        # 1. 获取目标版本的所有操作
        version = self.db.get_version(version_id)
        # 2. 找到最近的快照
        snapshot = self._find_nearest_snapshot(version_id)
        # 3. 从快照重放操作
        return self._replay_operations(snapshot, version.operations)

    def compare_versions(self, v1: str, v2: str) -> dict:
        """比较两个版本的差异"""
        ops1 = self.db.get_version_operations(v1)
        ops2 = self.db.get_version_operations(v2)
        return self._compute_diff(ops1, ops2)
```

#### 6.4 UI 展示设计

```tsx
// src/components/ai/VersionControlPanel.tsx
interface VersionControlPanelProps {
  currentVersion: string;
  branches: Branch[];
  history: DocumentVersion[];
}

const VersionControlPanel: React.FC<VersionControlPanelProps> = ({
  currentVersion,
  branches,
  history
}) => {
  return (
    <div className="version-control-panel">
      {/* 分支选择器 */}
      <BranchSelector
        branches={branches}
        current={currentVersion}
        onSwitch={handleBranchSwitch}
      />

      {/* 历史时间线 */}
      <Timeline>
        {history.map((version, idx) => (
          <TimelineItem
            key={version.id}
            active={version.id === currentVersion}
            onClick={() => handleVersionClick(version.id)}
          >
            <VersionIcon type={getOperationType(version)} />
            <VersionMessage>{version.message}</VersionMessage>
            <VersionTime>{formatTime(version.created_at)}</VersionTime>
            {version.branch !== 'main' && <BranchTag>{version.branch}</BranchTag>}
          </TimelineItem>
        ))}
      </Timeline>

      {/* 版本对比面板 */}
      {compareMode && (
        <DiffViewer
          before={versions[0]}
          after={versions[1]}
        />
      )}
    </div>
  );
};
```

#### 6.5 快捷键支持

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| `Ctrl+Z` | 单步撤销 | 撤销最后一次 AI 操作 |
| `Ctrl+Shift+Z` | 单步重做 | 重做已撤销的操作 |
| `Ctrl+H` | 打开历史面板 | 显示完整历史时间线 |
| `Ctrl+B` | 创建分支 | 从当前状态创建新分支 |
| `Ctrl+Shift+B` | 切换分支 | 快速切换分支 |
| `Ctrl+Shift+C` | 版本对比 | 打开版本对比视图 |

#### 6.6 MCP 工具扩展

| 工具名称 | 功能描述 |
|----------|----------|
| `history_list` | 获取操作历史列表 |
| `history_rollback` | 回退到指定版本 |
| `branch_create` | 创建新分支 |
| `branch_list` | 列出所有分支 |
| `branch_switch` | 切换到指定分支 |
| `version_compare` | 比较两个版本的差异 |
| `snapshot_create` | 手动创建快照 |

#### 6.7 性能优化策略

1. **增量存储**: 只存储变更内容，不存储完整文档
2. **快照策略**: 每 N 次操作创建一次完整快照
3. **懒加载**: UI 只加载可见范围的历史记录
4. **后台清理**: 自动清理超过保留期的历史
5. **压缩存储**: 历史数据使用压缩算法

```python
# 压缩示例
import zlib

def compress_changes(changes: dict) -> bytes:
    """压缩变更数据"""
    json_str = json.dumps(changes)
    return zlib.compress(json_str.encode())

def decompress_changes(data: bytes) -> dict:
    """解压变更数据"""
    json_str = zlib.decompress(data).decode()
    return json.loads(json_str)
```

---

### 7. 智能排版引擎设计

**决策**: 规则引擎 + AI 辅助

```
┌─────────────────────────────────────────────────────────┐
│                   用户请求                            │
│  "将所有标题统一为蓝色、18号字、加粗"                │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              意图解析 (AI)                           │
│  识别操作类型：样式统一                               │
│  目标元素：标题 (H1-H6)                              │
│  样式参数：颜色=蓝色, 大小=18, 粗细=加粗             │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              规则引擎 (Python)                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │  规则 1: 遍历所有段落                        │   │
│  │  规则 2: 识别标题样式 (Style.ID)              │   │
│  │  规则 3: 应用新样式                           │   │
│  │  规则 4: 验证冲突（避免覆盖手动格式）          │   │
│  └─────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              文档更新                                 │
│  使用 python-docx 批量应用样式                       │
└─────────────────────────────────────────────────────────┘
```

**排版规则类型**:

| 类型 | 规则示例 |
|------|----------|
| **样式统一** | 统一标题格式、正文格式、引用格式 |
| **段落优化** | 统一段落间距、首行缩进、对齐方式 |
| **表格美化** | 统一表头样式、边框样式、列宽 |
| **图片布局** | 统一图片大小、对齐方式、边距 |
| **清理冗余** | 删除空段落、合并重复样式、清理未使用样式 |

---

## 风险 / 权衡

### 风险 1: Python 子进程通信开销

**风险描述**: Rust 与 Python 之间的进程通信可能成为性能瓶颈

**缓解措施**:
- 使用 WebSocket 替代 stdio，提升吞吐量
- 实现请求批处理，减少通信次数
- Python 服务端保持常驻进程，避免重复启动

---

### 风险 2: DOCX 格式复杂性

**风险描述**: python-docx 无法完美支持所有 Word 特性

**缓解措施**:
- 明确支持的功能范围，不承诺 100% 兼容
- 对于不支持的特性，保留原始格式不修改
- 提供格式降级策略（如复杂图表转为图片）

---

### 风险 3: 大文件内存控制

**风险描述**: 流式解析可能在复杂文档中失效

**缓解措施**:
- 设置硬性内存限制 (100MB)，超出则拒绝操作
- 实现 LRU 缓存淘汰策略
- 提供文件大小检查警告

---

### 风险 4: MCP 协议兼容性

**风险描述**: MCP 标准可能变化，或与不同 AI 客户端不兼容

**缓解措施**:
- 使用官方 `@modelcontextprotocol/sdk`
- 实现版本检测和降级策略
- 提供兼容性测试脚本

---

### 权衡: 开发速度 vs 性能优化

**决策**: P0 功能优先实现，P1/P2 按需迭代

| 阶段 | 功能范围 |
|------|----------|
| **MVP** | 基础编辑 + MCP 读取/写入 |
| **V1.0** | 智能排版 + 批量操作 |
| **V1.1+** | 大文件流式处理 + 性能优化 |

---

## 迁移计划

### 开发阶段

```
Phase 1: 基础框架 (2-3 周)
├── Tauri 项目初始化
├── React 基础 UI
└── Python 服务启动

Phase 2: MCP 服务器 (1-2 周)
├── 实现 MCP 协议
├── 注册基础工具 (5-10 个)
└── Claude Desktop 集成测试

Phase 3: 文档处理 (2-3 周)
├── python-docx 集成
├── CRUD 操作实现
└── 格式化功能

Phase 4: 智能排版 (2-3 周)
├── 规则引擎实现
├── AI 意图解析
└── 常用排版规则

Phase 5: 大文件处理 (3-4 周)
├── SAX 解析器实现
├── 分块加载逻辑
└── 性能测试优化

Phase 6: UI 完善 (2-3 周)
├── Monaco Editor 集成
├── AI 对话面板
└── 文件浏览器
```

### 回滚策略

- 每个阶段独立 Git 分支，失败可快速回退
- Python 服务独立版本化，不影响桌面主程序
- MCP 工具增量发布，失败工具不影响其他工具

---

## 开放问题

### 待定决策

| 问题 | 状态 | 计划解决时间 |
|------|------|--------------|
| **Python 版本选择** | 开放 | MVP 阶段决定 (3.11+ 推荐) |
| **AI 模型选择** | 开放 | 随 MCP 客户端支持 |
| **文档预览渲染方式** | 开放 | Phase 6 决定 |
| **离线功能支持** | 开放 | V1.1+ 评估 |

### 技术调研需求

1. **Monaco Editor 对 DOCX 的支持程度**
2. **WebSocket vs stdio 性能差异实测**
3. **SAX 解析对复杂 DOCX 的兼容性**
4. **Tauri 2.0 Windows 打包稳定性**

---

## 附录

### 参考架构

- [Tauri 官方文档](https://tauri.app/)
- [MCP 协议规范](https://modelcontextprotocol.io/)
- [python-docx 文档](https://python-docx.readthedocs.io/)

### 性能目标

| 指标 | 目标值 | 测量方法 |
|------|--------|----------|
| 应用启动时间 | <1s | Tauri 内置计时 |
| 文档打开时间 | <1s (10MB) | 前端性能 API |
| 内存占用 (空闲) | <100MB | 进程监控 |
| 内存占用 (大文件) | <500MB | 进程监控 |
| MCP 工具响应时间 | <500ms | 端到端计时 |
