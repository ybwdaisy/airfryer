# Airfryer 分地区版本：埋点与 GA4 漏斗

2026-11-13。适用当前独立站 `airfryer.ybwdaisy.com`，中国11道、美国50种食物。本文区分代码、传输测试、GA4后台配置和正式入流；没有完成的环节不写成已完成。

## 目标与边界

回答：哪些渠道带来愿意阅读菜谱的人；用户是否找到食物；中文/英文、中国/美国集合、公制/美制分别表现如何；人在哪个内容阶段离开；是否回来查看别的菜谱。

**有效阅读不等于做菜成功。** `airfryer_guide_engaged` 仅说明：用户允许统计后，当前条件的操作步骤有至少100px（短区块则完整高度）进入视口，并累计前台可见10秒。后台、离开该区块、未同意及撤回后的时间不计。每个页面、每个食物条件最多记录一次；不同条件的时间不混加。不新增虚假的“完成烹饪”按钮或成功事件。

报告覆盖允许统计且成功发送事件的人，不是所有访问者。广告拦截、存储限制和浏览器关闭会造成缺失；不把Vercel请求数、事件次数、用户数混为同一分母。

## 当前状态

- 代码：独立分支 `codex/airfryer-analytics-v2`，基于生产合并提交 `b6807ba`；尚未合并或部署本轮修改。
- 浏览器：原浏览/双语回归和新版埋点测试；真实Google SDK的收集请求在发出前被拦截，不能据此声称GA4后台已经收到新事件。完整测试记录在忽略的 `output/analytics-v2/`；不含客户端标识的汇总见 [验证记录](evidence/analytics-v2-validation.json)。
- GA4：已从登录后台核对媒体资源 `494048879` 与用户指定数据流ID `16326517771`；同一媒体资源还有其他工具。进入名为“主站”的共享流详情被自动审批拦截；未通过其他路径绕过，也未改共享流设置。用户要求先等其他会话完成，再继续浏览器操作。
- **GA4自定义维度、关键事件与探索报告尚待实际配置和回读；以下是明确的执行规格，不是已完成回执。**

## 隔离与共同字段

Google公开衡量ID：`G-B34CBGW0EF`。仅正式规范源 `https://airfryer.ybwdaisy.com` 可以加载tag；本地、Preview和同一生产构建的vercel.app别名不启用收集。

所有手动事件包含：

| 字段 | 值与用途 |
|---|---|
| `tool_id` | 固定 `airfryer`，不接受调用方覆盖 |
| `analytics_version` | 固定字符串 `2`，用于标明本轮测量口径 |
| `food_collection` | 当前事件来源集合 `cn` / `us`，不是国籍或民族推断 |
| `ui_language` | 当前事件来源界面 `en` / `zh`；不再覆盖GA内置浏览器语言 |
| `measurement_units` | 当前显示 `c` / `f`，分别联动温度、重量和尺寸 |
| `page_type` | `home` / `category` / `recipe` / `reference` / `privacy` / `not_found` |
| `qa_traffic` | `no`为正常使用，`yes`为显式验收入口 |
| `content_group` | 使用GA内置页面分组：正常流量为`airfryer_{cn/us}_{en/zh}_{c/f}`；QA固定为`airfryer_qa` |
| `page_location` | 规范域名与服务端canonical路径，不含query/hash；未知地址归入`/404`或`/zh/404` |
| `category` | 预定义分类，目录未筛选时为`all` |

手动事件明确指定`send_to`为上述ID。全局默认在SDK加载前设置规范地址、无查询的来源origin、`send_page_view:false`、工具/版本/QA标识，防止SDK默认页浏览和自动事件带入查询内容。广告个性化与Google Signals保持关闭。

`?qa=1`将当前标签页标为QA，随后在该标签页导航会延续标记，并附`debug_mode`和`traffic_type:developer`。正常访问不要求参数。不改共享媒体资源的数据过滤器；Airfryer主探索使用GA内置Content group严格匹配`^airfryer_(cn|us)_(en|zh)_(c|f)$`，从第一版新数据开始排除QA，不等待新自定义维度传播。`qa_traffic`保留为辅助核查标记。不要用整个验收日粗暴排除真实流量。旧事件没有QA字段，不能事后补写；新版报告使用上述页面分组过滤，自然从新版事件开始。

## 事件字典

保留既有8类事件名称，避免无必要地拆断历史序列；新增专用事件用`airfryer_`前缀。

| 事件 | 触发与计数 | 附加参数 |
|---|---|---|
| `page_view` | 允许统计后每文档一次；撤回再允许不会补发多次 | 静态`page_title` |
| `airfryer_list_view` | 首页或分类的可用列表显示后，每文档一次 | `results_count` |
| `food_search` | 非空搜索有结果；输入停顿800ms、提交或立即点选时记录；同一查询/分类组合不重复 | `results_count`,`category`,`search_trigger` |
| `search_no_results` | 相同搜索规则，但结果为0 | 同上 |
| `search_clear` | 使用空结果区“显示全部”按钮 | 无原始搜索文本 |
| `food_select` | 搜索、普通目录、分类、相关菜谱或推荐入口点选 | `food_slug`,`category`,`entry_point`,`result_position`（列表入口） |
| `airfryer_guide_view` | 当前有效菜谱条件显示；包括SEO直达，每文档每条件一次 | `food_slug`,`condition`,`requires_hob`,`requires_thermometer`,`advance_preparation`,`recipe_units` |
| `airfryer_section_view` | 当前条件的准备/阶段时间/材料/步骤/完成检查/无温度计分支进入视口，每文档每条件每区块一次 | 上述菜谱参数＋`section` |
| `airfryer_guide_engaged` | 上述10秒操作步骤阅读阈值 | 上述菜谱参数＋`section=instructions`,`read_seconds=10` |
| `condition_change` | 用户切换到受来源支持的条件 | `food_slug`,`condition` |
| `unit_change` | 实际改变单位，不计点选已选中值 | `previous_unit`,`unit` |
| `language_change` | 切换语言，只计一次；来源语言和目标语言分开 | `target_language` |
| `region_change` | 实际切换集合，不计点选当前集合 | `target_collection` |
| `airfryer_source_open` | 展开来源条目，属于辅助理解，不作为转化成功 | `reference_role`及菜谱参数 |
| `airfryer_reference_click` | 点外部来源/安全资料链接，属于点击意图 | `reference_role`,`reference_host`及菜谱参数 |

`entry_point`为`search/browse/category/related/featured`；`section`为`preparation/timing/ingredients/instructions/completion/without_thermometer`。所有字段经过白名单；不发送搜索词、配料输入、任意对象、完整来源URL、未知事件名或用户ID。

同标签页的食物、语言和集合跳转：**仅获同意后**把白名单事件及来源上下文暂存到sessionStorage，目标路径匹配且30秒内由目标页面发送一次，然后删除。来源语言/集合/单位不会被目标页面覆盖。输入后立即点选时，尚未记录的白名单搜索结果事件也随本次导航按顺序发送，不保存查询词。撤回、授权被清除、过期或目标不符时丢弃。正常跳转无需等待Google；sessionStorage不可用时使用最长300ms的SDK回调兜底。修饰键/新标签页及外部链接为尽力发送的点击意图，不把它们说成已完成阅读。

## GA4待执行配置

媒体资源 `494048879`。只新增Airfryer专用定义/探索；复用相同参数的既有事件级定义时先核对含义，不重命名其他工具。不要修改数据流名称/网站URL、其他流、共享增强衡量、保留期、广告关联、其他工具的关键事件或探索。

注册以下**事件级**自定义维度。先读已有定义和额度，避免重复或耗尽共享名额。`Content group`、`Hostname`、`Country`、`Device category`、`Session source / medium`、`Event name`使用GA内置维度；不重复注册。`tool_id`和版本仍留在事件包，无须占用维度名额。

| 显示名称 | 参数 |
|---|---|
| Airfryer 食物集合 | `food_collection` |
| Airfryer 界面语言 | `ui_language` |
| Airfryer 计量单位 | `measurement_units` |
| Airfryer 食物标识 | `food_slug` |
| Airfryer 食物条件 | `condition` |
| Airfryer 入口位置 | `entry_point` |
| Airfryer 阅读阶段 | `section` |

若已有`qa_traffic`定义则复用核查；本轮不为QA另占名额，主过滤用内置Content group。

仅把`airfryer_guide_engaged`标为关键事件，名称说明为“菜谱步骤有效阅读”，计数方式选“每会话一次”；普通事件次数仍可衡量一次访问读了多少份内容。不使用“烹饪成功”。不把单位切换、来源点击、点开页面标为成功。

主探索名称：**空气炸锅｜获客、分地区与菜谱阅读 v2**。统一使用**事件级**细分：`Hostname`精确等于`airfryer.ybwdaisy.com`且内置`Content group`正则完整匹配`^airfryer_(cn|us)_(en|zh)_(c|f)$`，不使用contains。新的`qa_traffic`维度尚未传播时也能保存这个过滤条件。默认过去30个完整日；保留一个单独“验收/今日”视图查看QA，不混入主报告。

| 标签 | 配置 |
|---|---|
| 获客渠道 | 自由形式；行Session source / medium，列可选Device category；指标Total users、Sessions、Engaged sessions、Key events。后者明确只看本站有效阅读关键事件。Country作为可选行维度，不用食物集合冒充用户所在国家。 |
| 地区与语言 | 自由形式；新维度可选后使用行食物集合、列界面语言，计量单位作为可选细分；传播前可用内置Content group查看8种集合/语言/单位组合，并明确标注这个实际配置；指标Total users、Event count。可加关键事件率，先确认分母/事件过滤。 |
| 目录到阅读 | **闭合漏斗**：`airfryer_list_view` → `airfryer_guide_view` → `airfryer_guide_engaged`；步骤间允许其他事件，限制30分钟。 |
| 搜索到阅读 | **闭合漏斗**：`food_search` → `food_select` → `airfryer_guide_view` → `airfryer_guide_engaged`；限制30分钟；失败搜索另看`search_no_results`次数与相同触发口径。 |
| 菜谱阅读（含直达） | **闭合漏斗**：`airfryer_guide_view` → `airfryer_guide_engaged`；没有“先访问首页”的门槛，SEO直达也能进入。它不是只包含自然搜索的漏斗。 |
| 食物与条件 | 自由形式；行食物标识、条件，列Event name；过滤`airfryer_guide_view/airfryer_guide_engaged`；指标Total users、Event count。不要用事件次数当不同使用人数。 |
| 阅读阶段 | 自由形式；过滤`airfryer_section_view`；行阅读阶段，指标Total users、Event count。屏幕能直接看到后段并不保证按顺序阅读，故不把这些曝光拼成必经漏斗。 |

漏斗按GA4用户和规定顺序统计，不是把独立事件总数相除；同一用户在分析范围重复多次会受GA4漏斗计数规则影响。事件级站点隔离不等于跨session限制，30分钟步骤窗口须在实际UI回读确认。

另建或保留独立回访探索：首次满足`airfryer_guide_engaged`作为纳入条件，回访同一事件；D7查看足够日期，D30使用至少31–60天窗口。新站不足观察天数时明确“尚无足够观察期”，不要把0当无需求。GA4 cohort可能把相对日期固定成自定义日期，保存后重开核对，不能宣称自动滚动。

## 核验与交付

1. 本地/Preview不加载Google；规范源模拟本地构建以验证精确域名门禁。
2. 实际SDK使用真实公开tag脚本，但收集transport在派发前拦截；检查所有事件包、自动页浏览、query、同意前/撤回后，以及导航事件可靠性。
3. 合并发布后，先在正式规范源以`qa=1`进行最小验收；若需要证明入流，再观察专用事件的Realtime/DebugView，不能用204或SDK拦截记录代替后台处理证据。
4. 保存GA4维度、关键事件、各标签步骤/过滤/日期并重新打开确认；记录实际报告URL与配置时间。新维度通常需要24–48小时才能用于完整报表，且不会回填旧事件。
5. 代码走功能分支→检查→PR；合并发布需要用户明确授权。本轮GA4后台按用户要求等待其他会话结束后再继续。

Google依据：[GA内置Content group](https://developers.google.com/analytics/devguides/collection/ga4/reference/config#content_group)、[事件参数与自定义维度](https://developers.google.com/analytics/devguides/collection/ga4/event-parameters)、[事件级自定义维度](https://support.google.com/analytics/answer/14239696?hl=en)、[漏斗探索及用户计数](https://support.google.com/analytics/answer/9327974?hl=en)、[Google tag事件回调参数](https://developers.google.com/tag-platform/gtagjs/reference/parameters)。

已完成的代码验证：Astro检查60文件，0 error/warning/hint；15项单元测试；生产输出检查与152页构建；9组埋点浏览器测试及真实SDK事件包检查；既有8组功能、8组双语与9组地区化回归（244个语言/单位页面，48个响应式布局）。统计收集在派发前被拦截，不把这些结果当后台入流。
