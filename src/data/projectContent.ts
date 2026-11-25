// Project write-ups for the home page (ProjectShowcase.astro) and the CV page. Classification lives in projects.ts.
import { toolUrl, type Language } from './siteTools.ts';

export type Project = {
  id: string; title: string; context: string; date: string; award?: string; role?: string; blurb: string; part?: string;
  steps: [string, string][]; facts: string[]; stack: string[]; links: { href: string; label: string }[];
  game: { title: string; goal: string }; caption: string; labels: string[];
};

export function projectContent(lang: Language): Project[] {
  const zh = lang === 'zh';
  const t = (en: string, cn: string) => (zh ? cn : en);
  const mona = toolUrl('pid', lang) + '?scenario=mona&payload=0.5&compare=1&kp=8&ki=1&kd=4';
  return [
  {
    id: 'hackabot-2026', title: t('Robots pushing a trolley together', '多机器人协同推车'),
    context: t('Hack-a-Bot 2026, UoM RoboSoc', 'Hack-a-Bot 2026，曼彻斯特大学 RoboSoc'), date: t('Mar. 2026', '2026.03'),
    award: t('Third prize', '三等奖'), role: t('Team leader', '团队负责人'),
    blurb: t("Up to three MONA differential-drive robots must push a trolley into a goal zone around obstacles, sensing only through a shared overhead camera and communicating over Wi-Fi. Perception, planning and formation control run centrally on a laptop as one closed loop.", "最多三台 MONA 差速机器人须绕开障碍、把推车推入目标区；感知只有一台共享的头顶相机，通信只有 Wi-Fi。感知、规划与编队控制集中运行在笔记本上，构成一个闭环。"),
    part: t('led the team and the whole software stack: ArUco localisation, clearance-aware A* planning, Pure Pursuit and PID tracking, and the robot link', '带队，并负责整套软件：ArUco 定位、留足安全距离的 A* 规划、Pure Pursuit 与 PID 跟踪，以及和机器人的通信'),
    steps: [
      [t("Perception", "感知"), t("ArUco pose estimation places every robot, the trolley and the goal in one arena frame, and a short-horizon tracker bridges brief marker dropouts. Obstacles are colour-segmented into an occupancy grid with the markers themselves masked out.", "ArUco 位姿估计把机器人、推车和目标区统一到场地坐标系，短时跟踪器补上标记的短暂丢失；障碍物经颜色分割写入占用栅格，并剔除标记自身所在区域。")],
      [t("Planning", "规划"), t("A* searches the grid with obstacles inflated by the robot footprint and a penalty on turning; the path is then simplified (Ramer–Douglas–Peucker) and smoothed (Chaikin). The trolley leg carries a heavier turn penalty because a pushing formation turns poorly.", "A* 在按机器人尺寸膨胀后的栅格上搜索，并对转向加罚；路径再经 Ramer–Douglas–Peucker 化简和 Chaikin 平滑。推车段的转向罚项更重，因为推车队形难以转弯。")],
      [t("Formation control", "编队控制"), t("Pure Pursuit with adaptive look-ahead brings each robot to its slot behind the trolley. During the push, a rigid-body controller holds every robot at a fixed offset from the trolley pose, correcting position and heading error with encoder-based yaw damping.", "Pure Pursuit（自适应前视距离）把各机器人送到推车后方的编队位置；合推阶段，刚体编队控制器让每台机器人相对推车位姿保持固定偏置，校正位置与航向误差，并以编码器做偏航阻尼。")],
    ],
    facts: [
      t("Fail-safe layers for a Wi-Fi control loop: a command watchdog on each robot, a stop on stale vision, and stall detection from the encoders.", "Wi-Fi 闭环的安全层：机器人端指令看门狗、视觉数据过期即停、编码器堵转检测。"),
      t("A mission state machine sequences binding (robot to marker), planning, approach and push, with an explicit fault state.", "任务状态机依次执行绑定（机器人与标记配对）、规划、接近、合推，并设有显式故障态。"),
    ],
    stack: ['OpenCV', 'ArUco', 'A*', 'Pure Pursuit', 'PID', 'TCP'],
    links: [{ href: 'https://hackabot-2026.com/live/project-4/', label: t('Official brief', '官方赛题') }],
    game: { title: t('Trolley push', '协同推车'), goal: t('Drive both robots and push the trolley into the goal zone.', '同时控制两台机器人，将推车推入终点区。') },
    caption: t('Overhead view of the arena', '场地俯视图'), labels: [t('Goal area', '目标区')],
  },
  {
    id: 'openclaw-2026', title: 'OperatorOne',
    context: t('UK AI Agent Hackathon EP4 × OpenClaw, Imperial College London', 'UK AI Agent Hackathon EP4 × OpenClaw，伦敦帝国理工学院'), date: t('Mar. 2026', '2026.03'),
    blurb: t("A multi-agent system that takes a business idea through product, marketing, sales and operations. A CEO orchestrator runs four specialist OpenClaw agents in stage-gated cycles towards a revenue target.", "一个把商业想法推进到产品、市场、销售与运营的多智能体系统：CEO 编排器以分阶段门控的循环调度四个 OpenClaw 专职智能体，向收入目标迭代。"),
    part: t('the CEO orchestrator, the dashboard’s run API and timeline, the GLM-5 model connection with its preflight check, the safety switches for live actions, and the submission documents', 'CEO 编排脚本，仪表板的运行接口和时间线，GLM-5 模型接入和预检，真实外发动作的安全开关，以及参赛提交材料'),
    steps: [
      [t("Orchestration", "编排"), t("The orchestrator holds the venture state (goal, budget, deadline) and runs Product → Marketing → Sales → Operations until the target is met or the cycle limit is reached. Every external action is gated by an approval file.", "编排器维护项目状态（目标、预算、期限），按产品 → 市场 → 销售 → 运营循环执行，直至达成目标或用尽轮次上限；所有对外动作都经审批文件门控。")],
      [t("Contracts", "契约"), t("Agents exchange typed, versioned JSON contracts instead of chained prompts. A validator checks every hand-off in CI, so a malformed output halts the pipeline rather than propagating downstream.", "智能体之间传递带类型与版本号的 JSON 契约，而非串联提示词；CI 中的校验器检查每一次交接，格式错误的产出会中止流水线，而不是向下游传播。")],
      [t("Feedback", "反馈"), t("Operations writes feedback and iteration contracts back to the upstream agents for the next cycle. The dashboard exposes a run API, a per-run timeline and error visualisation.", "运营智能体把反馈与迭代契约写回上游智能体，进入下一轮；仪表板提供运行接口、单次运行时间线和错误可视化。")],
    ],
    facts: [
      t("A dry-run mode exercises the full loop with simulated replies, making the demo reproducible at zero API cost; live email and deployment require a manual arm plus confirmation.", "演示模式以模拟回复跑通完整循环，零 API 成本即可复现；真实发信与部署须先手动解锁再二次确认。"),
      t("The GLM-5 provider sits behind a hard preflight gate with no silent fallback, and every model call is audited by model, step, latency and token use.", "GLM-5 接入设硬性预检、不做静默回退，每次模型调用按模型、步骤、延迟和用量留痕审计。"),
    ],
    stack: ['OpenClaw', 'Python', 'GLM-5', 'JSON', 'GitHub Actions'],
    links: [{ href: 'https://github.com/Daihaolin201/operator-one', label: t('Code on GitHub', 'GitHub 代码库') }],
    game: { title: t('Venture loop', '智能体经营循环'), goal: t('Keep four agents at capacity and clear stuck stages and complaints before they cost revenue.', '保持四个智能体满负荷运转，及时处理环节卡顿和客户投诉。') },
    caption: t('The CEO agent and the four agents it runs', 'CEO 智能体和它调度的四个智能体'),
    labels: [t('Product', '产品'), t('Marketing', '市场'), t('Sales', '销售'), t('Operations', '运营'), 'CEO', t('Dashboard: run timeline', '仪表板：运行时间线'), t('feedback', '反馈'), t('approval', '审批')],
  },
  {
    id: 'hackabot-2025', title: t('MONA delivery bot', 'MONA 自主配送机器人'),
    context: t('Hack-a-Bot 2025, UoM RoboSoc & Sony', 'Hack-a-Bot 2025，曼彻斯特大学 RoboSoc 与 Sony'), date: t('Mar. 2025', '2025.03'), award: t('First prize', '一等奖'),
    blurb: t("A 24-hour challenge: a MONA robot must deliver autonomously through a tape maze, Start → Pickup → Dropoff, in a single timed run, localised only from an overhead camera stream.", "24 小时挑战：MONA 机器人须在一次限时运行中自主穿越胶带迷宫，完成起点 → 取货点 → 卸货点的配送，定位只依赖头顶摄像头的视频流。"),
    part: t('the overhead vision, A* planning and PID control, and the Arduino code for the radio link and motor calibration', '头顶视觉、A* 规划和 PID 控制，以及无线链路和电机校准的 Arduino 代码'),
    steps: [
      [t("Mapping", "建图"), t("Adaptive Gaussian thresholding and morphological closing extract the tape network under uneven lighting. ArUco markers locate Start, Pickup, Dropoff and the robot, and each waypoint is snapped to the nearest traversable pixel.", "自适应高斯阈值配合形态学闭运算，在光照不均时提取胶带路网；ArUco 标记给出起点、取货点、卸货点与机器人位置，各航点吸附到最近的可通行像素。")],
      [t("Planning", "规划"), t("A 4-connected A* with a Manhattan heuristic plans both legs and joins them into one waypoint sequence.", "四连通 A*（曼哈顿启发）分别规划两段路线，并拼接为一条航点序列。")],
      [t("Control", "控制"), t("A PID loop on distance and heading error produces differential wheel commands, relayed laptop → USB → NRF24L01 → robot. Integral clamping with a reset at every waypoint prevents windup; the robot pauses and reverses at the pickup.", "PID 按距离与航向误差生成差速轮指令，经笔记本 → USB → NRF24L01 无线链路下发；积分限幅并在每个航点清零以防饱和，到取货点停顿后掉头。")],
    ],
    facts: [
      t("An encoder calibration routine measured the left–right motor mismatch to derive wheel compensation.", "以编码器标定程序测量左右电机差异，得出轮速补偿系数。"),
    ],
    stack: ['OpenCV', 'ArUco', 'A*', 'PID', 'NRF24L01', 'Arduino'],
    links: [{ href: 'https://uom-robosoc.github.io/tasks/Task%202.html', label: t('Official brief', '官方赛题') }, { href: mona, label: t('Open the PID challenge', '打开 PID 调参挑战') }],
    game: { title: t('Delivery race', '配送竞速'), goal: t('Follow the tape from Start to Pickup to Dropoff ahead of the autopilot ghost.', '沿胶带依次到达起点、取货点、卸货点，先于自动驾驶影子完成。') },
    caption: t('Overhead view: Start → Pickup → Dropoff', '俯视图：起点 → 取货 → 卸货'), labels: [t('Start', '起点'), t('Pickup', '取货'), t('Dropoff', '卸货')],
  },
  {
    id: 'puzzlethon-2024', title: t('Line tracking and traffic signs', '循迹与交通标志识别'),
    context: t('NVIDIA PuzzleThon, Manchester Robotics and UoM', 'NVIDIA PuzzleThon，Manchester Robotics 与曼彻斯特大学'), date: t('Apr. 2023', '2023.04'), award: t('Second prize', '二等奖'),
    blurb: t("An autonomous PuzzleBot (Jetson Nano, ROS) must drive an unseen track with no human input: follow the line, obey red and green lights and act on direction signs.", "自主 PuzzleBot（Jetson Nano、ROS）须在未知赛道上无人干预地行驶：循线、遵守红绿灯、按方向标志动作。"),
    part: t('colour filtering and masking, line following and sign recognition', '颜色滤波与掩膜、循迹和标志识别'),
    steps: [
      [t("Perception", "感知"), t("A hardware GStreamer pipeline keeps camera latency low. The line centroid comes from a thresholded region of interest at the bottom of the frame; signs are segmented in HSV, perspective-rectified and classified from their pixel distribution; lights are found with HSV masks and a Hough circle transform after brightness normalisation.", "相机经 GStreamer 硬件管线低延迟采集。循线取画面底部感兴趣区域二值化后的质心；方向标志经 HSV 分割、透视校正，再按像素分布分类；信号灯先做亮度归一化，再以 HSV 掩膜和霍夫圆变换检测。")],
      [t("Architecture", "架构"), t("Perception and control run as separate ROS nodes: the perception node publishes line position, sign and light state on three topics, and the controller subscribes and latches the latest detections.", "感知与控制拆为两个 ROS 节点：感知节点在三个话题上发布线位置、标志与信号灯状态，控制节点订阅并锁存最新检测结果。")],
      [t("Control", "控制"), t("The controller steers proportionally on the line error and executes timed manoeuvres: a hold at red, differential-speed turns on left and right signs.", "控制节点按线偏差比例转向，并执行定时机动：红灯停车，左、右转标志时差速转向。")],
    ],
    facts: [
      t("Normalising brightness before colour thresholding kept light detection stable under changing room lighting.", "颜色阈值前先归一化亮度，环境光变化时信号灯检测依然稳定。"),
    ],
    stack: ['ROS', 'Python', 'OpenCV', 'Jetson Nano'],
    links: [{ href: 'https://www.linkedin.com/posts/manchesterrobotics-puzzlebot-autonomousdriving-ugcPost-7344312943968223232-FV-K/', label: t('Related post', '相关帖子') }],
    game: { title: t('Sign recognition', '标志识别'), goal: t('Classify each light or sign as stop, slow or go before it reaches the car.', '在标志到达车前判断：停车、减速或通行。') },
    caption: t('Camera view: line strip, sign regions, light', '摄像头画面：找线窄带、标志分区、信号灯'), labels: [t('light', '信号灯'), t('sign', '标志'), t('stop 2 s', '停 2 秒')],
  },
  {
    id: 'traffic-cones', title: t('Smart traffic cones', '智能交通锥'),
    context: t('Third-year individual project, The University of Manchester', '本科三年级个人项目，曼彻斯特大学'), date: t('Sept. 2023 – May 2024', '2023.09—2024.05'),
    blurb: t("Robotic traffic cones that deploy themselves: four cone vehicles, one leader and three followers, queue at a set spacing and reproduce the leader’s route, directed from a handheld controller over an 802.15.4 radio network.", "可自主布设的机器人交通锥：四台锥桶车（一台领航、三台跟随）按设定间距列队并复现领航车的路线，由手持控制器经 802.15.4 无线网络指挥。"),
    part: t('all of it: the ESP32-S3 control board, the ESP32 and STM32 firmware, the radio protocol, the control loops and the experiments', 'ESP32-S3 控制板、ESP32 和 STM32 固件、无线协议、控制回路和实验，全部独立完成'),
    steps: [
      [t("Command", "指令"), t("A handheld STM32 controller sends commands over XBee (802.15.4) to the leader, which broadcasts them to the group by vehicle ID. A busy/idle flag and an end-of-frame marker arbitrate the half-duplex link so commands and telemetry never collide.", "手持 STM32 控制器经 XBee（802.15.4）把指令发给领航车，再按车辆 ID 广播给全组；半双工链路以忙闲标志和帧结束标记仲裁，指令与遥测互不冲突。")],
      [t("Spacing", "间距保持"), t("Each follower measures the gap to the vehicle ahead ultrasonically and regulates it with a distance PID, cascaded over per-wheel speed PID on the encoders.", "每台跟随车以超声测量与前车的间距，由距离 PID 调节，内环为基于编码器的轮速 PID。")],
      [t("Deployment", "布设"), t("The leader logs encoder counts for every straight and turn of the route and transmits the sequence; the followers replay it to take up the same formation.", "领航车记录路线中每段直行与转弯的编码器计数并发送，跟随车按序列复现，形成相同的布设队形。")],
    ],
    facts: [
      t("A custom ESP32-S3 board integrates the XBee radio, TB6612 motor driver, OLED, ultrasonic interface and a multi-rail power supply; layout faults found at bring-up were fixed in the next revision.", "自研 ESP32-S3 主控板集成 XBee 无线、TB6612 电机驱动、OLED、超声接口和多路电源；调试中发现的布局问题在下一版改正。"),
    ],
    stack: ['ESP32-S3', 'STM32', 'XBee 802.15.4', 'PCB', 'PID'],
    links: [{ href: 'https://github.com/Daihaolin201/Smart-TrafficCones', label: t('Code on GitHub', 'GitHub 代码库') }],
    game: { title: t('Lane closure', '车道封闭'), goal: t('Dispatch every cone to its slot before the car reaches the work zone.', '在车辆到达施工区前，将锥桶全部派往指定位置。') },
    caption: t('Handheld controller, 802.15.4 link, leader (4) and three followers', '手持控制器、802.15.4 链路、领航车（4）与三台跟随车'), labels: ['STM32', 'ESP32-S3 × 4', 'XBee', t('ultrasonic', '超声'), t('route as encoder counts', '以编码器计数记录路线')],
  },
  {
    id: 'esp-buggy', title: t('ESP buggy', 'ESP 自主循迹小车'),
    context: t('Embedded Systems Project, The University of Manchester', '嵌入式系统项目，曼彻斯特大学'), date: t('Sept. 2022 – May 2023', '2022.09—2023.05'),
    award: t('Third prize', '三等奖'),
    blurb: t("An autonomous line-following buggy on an STM32F401 (Mbed C++) for a course with slopes, a 180° turnaround and a controlled stop, built by a team of five from a custom sensor board up.", "基于 STM32F401（Mbed C++）的自主循迹小车，赛道包含坡道、180° 掉头与受控停车；五人团队从自制传感器板做起。"),
    part: t('circuit design and the sensor board (three revisions in Altium), software, and the system summary in the final report', '电路设计和传感器板（Altium 迭代三版）、软件，以及期末报告的系统部分'),
    steps: [
      [t("Sensing", "传感"), t("Six TCRT5000 reflective sensors feed LM393 comparators whose reference is derived from the supply, so thresholds track battery droop without ADC calibration. The sensor pattern maps to a weighted line error.", "六路 TCRT5000 反射式传感器接 LM393 比较器，参考电压取自同一电源，阈值随电池电压同步变化，无需 ADC 标定；传感器组合映射为加权偏差。")],
      [t("Control", "控制"), t("A PD loop on the line error sets the wheel-speed differential, and a PI loop on quadrature-encoder velocity holds speed on slopes; gains were tuned from Ziegler–Nichols starting values.", "PD 回路由偏差计算两轮差速，正交编码器测速的 PI 回路在坡道上稳住车速；增益以 Ziegler–Nichols 为起点整定。")],
      [t("State machine", "状态机"), t("A finite-state machine (hold, follow, turn-around, stop) is driven by Bluetooth LE commands. The turnaround spins until the centre sensor reacquires the line, independent of floor friction.", "有限状态机（待命、循迹、掉头、停车）由蓝牙 LE 指令驱动；掉头时原地旋转直至中间传感器重新捕获黑线，不受地面摩擦影响。")],
    ],
    facts: [
      t("Two sensors are staggered so one always covers the line across a break, with no extra logic.", "两路传感器错位布置，断线处始终有一路压线，无需额外逻辑。"),
      t("Third overall in the heats. Moving the battery forward and a lighter T-shaped chassis stopped the front lifting at speed.", "预赛总排名第三。电池前移并改用更轻的 T 形底盘，消除了高速时的车头抬起。"),
    ],
    stack: ['STM32', 'Mbed C++', 'Altium PCB', 'PID', 'BLE'],
    links: [],
    game: { title: t('Buggy PID tuning', '循迹小车 PID 整定'), goal: t('Find one gain set that completes all three tracks without leaving the line.', '找到一组增益，使小车不出线跑完三条赛道。') },
    caption: t('Six sensors, PD and PI loops, Bluetooth turn', '六个传感器、PD 与 PI 回路、蓝牙掉头'), labels: [t('6 sensors', '6 个传感器'), 'PD + PI', t('BLE turn', '蓝牙掉头')],
  },
  {
    id: 'software-tools-2026', title: t('CSF Pilot and research tools', 'CSF Pilot 与科研工具'),
    context: t('Desktop software for HPC, literature and figures', '桌面软件：集群作业、文献、论文图'), date: t('Jul. 2026 – present', '2026.07—至今'),
    blurb: t("CSF Pilot is a desktop client (PySide6) for the University of Manchester CSF3 HPC cluster. It keeps one MFA-authenticated SSH session, multiplexes file transfer, Slurm job control, an editor, a terminal and usage analytics over it, and exposes the session to AI agents through an MCP server.", "CSF Pilot 是曼彻斯特大学 CSF3 高性能计算集群的桌面客户端（PySide6）。它维持一条经多因素认证的 SSH 会话，在其上复用文件传输、Slurm 作业管理、编辑器、终端和用量分析，并通过 MCP 服务把这条会话开放给 AI 智能体。"),
    steps: [
      [t("Session", "会话"), t("One paramiko transport, authenticated once through keyboard-interactive MFA, carries SFTP, Slurm exec channels and an interactive PTY. Channel concurrency stays below the server’s per-connection session limit under an ordered lock hierarchy.", "一条 paramiko 传输层只做一次键盘交互式多因素认证，其上同时承载 SFTP、Slurm 命令通道与交互式 PTY；通道并发控制在服务器单连接会话上限以内，并按固定次序加锁以避免死锁。")],
      [t("Agent access", "智能体接入"), t("An MCP server exposes cluster operations to AI agents such as Claude Code. A loopback bridge lets them reuse the GUI’s authenticated session; requests and responses carry mutual HMAC signatures, so a process without the token can neither call the bridge nor impersonate it.", "MCP 服务把集群操作开放给 Claude Code 等 AI 智能体；回环桥接让它们复用图形界面已认证的会话，请求与响应双向 HMAC 签名，拿不到令牌的进程既无法调用桥接，也无法冒充它。")],
      [t("Job lifecycle", "作业生命周期"), t("squeue is polled with back-off and outage detection. A per-user job ledger reconciles jobs that leave the queue through one batched sacct query, so the true final state, the notification and the result download survive laptop sleep.", "以带退避与故障检测的方式轮询 squeue；按用户维护的作业台账在作业离开队列后，以一次批量 sacct 查询对账，电脑中途休眠也能取回真实终态、发出通知并下载结果。")],
    ],
    facts: [
      t("The built-in assistant’s only route to the shell is a parser, not a filter: it rejects chaining, redirection, substitution and globs, allowlists programs and options, and rebuilds the command from validated tokens.", "内置助手触达 shell 的唯一途径是解析器而非过滤器：拒绝命令串联、重定向、命令替换与通配符，对程序和参数做白名单，再由校验过的词元重建命令。"),
      t("Remote processes are stopped with TERM then KILL, because closing an SSH channel does not terminate the remote command.", "远端进程先发 TERM、再发 KILL，因为关闭 SSH 通道并不会终止远端命令。"),
      t("Paper Radar ranks arXiv, OpenAlex and Semantic Scholar candidates against a Zotero library with two separate, inspectable scores; FigForge renders CSV and MATLAB data to publication vector figures from a reproducible JSON spec.", "Paper Radar 以 Zotero 文库为参照，对 arXiv、OpenAlex、Semantic Scholar 候选论文给出两项独立、可解释的评分；FigForge 从可复现的 JSON 图形规格出发，把 CSV 与 MATLAB 数据渲染为论文矢量图。"),
    ],
    stack: ['PySide6', 'paramiko', 'Slurm', 'MCP', 'pytest'], links: [],
    game: { title: t('Cluster scheduling', '集群作业调度'), goal: t('Schedule incoming Slurm jobs onto the nodes before the queue overflows.', '在队列溢出前，将新到的 Slurm 作业排上节点。') },
    caption: t('CSF Pilot: one MFA session, agent access over MCP, job lifecycle', 'CSF Pilot：单次认证的会话、MCP 智能体接入、作业生命周期'),
    labels: [t('Session', '会话'), t('Agent access', '智能体接入'), t('Job lifecycle', '作业生命周期')],
  },
  {
    id: 'local-workbenches', title: t('Teaching workbenches', '教学工作台'),
    context: t('Local-first browser apps for tutoring and student support', '家教与学生服务用的本地浏览器应用'), date: t('Sept. 2026 – present', '2026.09—至今'),
    blurb: t("A local-first, single-file web application that runs a tutoring practice end to end: students, scheduling, lesson preparation, homework, feedback, credit-hour packages and pay reconciliation. The system of record is one JSON file in a user-chosen folder, accessed through the File System Access API.", "本地优先的单文件 Web 应用，覆盖家教业务全流程：学生、排课、备课、作业、课后反馈、课时包与工资对账。权威数据是用户所选文件夹中的一个 JSON 文件，经 File System Access API 读写。"),
    steps: [
      [t("Persistence", "持久化"), t("Every save writes the JSON record atomically after keeping a timestamped backup; the browser cache is treated as a snapshot, never as the source of truth.", "每次保存先留时间戳备份，再以原子方式写入 JSON；浏览器缓存只作快照，不作为权威数据。")],
      [t("Concurrency", "并发"), t("Concurrent tabs are detected even without storage events, so a stale tab cannot overwrite a newer save. A diff view lists changed, added and removed rows, and both versions are pinned as backups before one is adopted.", "即使没有 storage 事件也能识别多标签页并发，过期页面无法覆盖较新的保存；差异视图列出改动、新增与删除的行，采用某一版本前两份均固定备份。")],
      [t("Outputs", "输出"), t("Lessons export as ICS with time-zone-aware deadlines, feedback exports to Markdown and print-ready PDF, and pay is reconciled only from verified taught sessions.", "课表导出为 ICS 并正确处理时区，反馈导出为 Markdown 与可打印 PDF，工资仅依据已核实的授课记录对账。")],
    ],
    facts: [
      t("A corrupt cache is preserved verbatim and never adopted; data written by a newer schema opens read-only so unknown fields survive.", "损坏的缓存原样保留、不被采用；新版本数据结构写入的数据以只读方式打开，未知字段不会丢失。"),
      t("A sister workbench supports a student-services role: SOP checklists, calendar, fees and hours, and formal reports that export only once their evidence is verified.", "同类工作台另用于学生服务工作：SOP 清单、日程、费用与课时，正式报告须在证据核验后方可导出。"),
    ],
    stack: ['HTML', 'JavaScript', 'File System Access API', 'ICS', 'node:test'], links: [],
    game: { title: t('Weekly timetable', '一周排课'), goal: t('Schedule every lesson within the constraints, then export the calendar.', '在约束内排入全部课程，再导出日历。') },
    caption: t('Record, resolve conflicts, export', '记录、防冲突、导出'), labels: ['ICS', 'Markdown', 'PDF', t('backups', '备份')],
  },
  ];
}
