const i18n = {
  currentLang: 'en',

  translations: {
    zh: {
      nav: { about: "关于", research: "研究", publications: "论文", projects: "项目", experience: "经历", awards: "荣誉", contact: "联系" },
      name: "李栋林 (Dennis Li)",
      profile: {
        title: "博士研究生（2024至今）",
        rep: "EEE博士生代表（2024至今）",
        affiliation: "曼彻斯特大学 电气与电子工程学院",
        cv: "简历", email: "邮箱", github: "代码库", linkedin: "领英", updates: "动态"
      },
      hero: { tagline: "让多机器人系统在真实世界中稳健协作。", badge: "欢迎合作", kicker: "博士 · 控制、机器人与人工智能 · 曼彻斯特大学" },
      stats: { papers: "第一作者论文", awards: "奖项", honours: "一等荣誉学位" },
      about: {
        title: "关于我",
        description: "我是曼彻斯特大学电气与电子工程系（控制、机器人与人工智能方向）博士研究生（2024至今），本科亦就读于曼彻斯特大学电气与电子工程专业，以一等荣誉学位毕业（2021—2024年）。研究方向包括分布式控制、多机器人协调以及自主系统的不确定性感知决策。我还担任研究生教学助理，负责控制与机器人相关课程的辅导工作，同时担任EEE博士生代表（部门负责人，2024至今）。",
        tags: ["分布式控制", "多机器人系统", "共识与编队", "主动寻源", "双重控制"]
      },
      research: {
        title: "研究兴趣",
        interests: [
          "面向多机器人协同寻源的分布式贝叶斯主动感知，兼顾通信、安全与计算约束。",
          "探索–利用双重控制（DCEE）：引入持续激励与 Fisher 信息感知的信息采集。",
          "通信高效的协同：事件触发融合，以及切换/丢包网络拓扑下的寻源控制。",
          "学习增强与多模态自主搜索：强化学习/世界模型规划、协同定位与大模型引导协调。"
        ]
      },
      publications: {
        title: "论文与成果",
        items: [
          { title: "Dual Control for Multi-Robot Source Seeking with Consensus Mean Fusion and Safety Projection", meta: "第一作者 · 第45届中国控制会议 (CCC 2026)，长沙", tag: "已录用" },
          { title: "Trace Weighted Event-Triggered Mean Fusion for Efficient Multi-Robot Source Seeking", meta: "第一作者 · 第8届工业人工智能国际会议 (IAI 2026)，沈阳", tag: "审稿中" },
          { title: "Multi-Objective Pipeline Scheduling for LLM Inference in Heterogeneous DePIN", meta: "共同作者 · IFAC 世界大会 2026，釜山", tag: "已录用" },
          { title: "Load Balancing for LLM Inference Serving: A Control and Learning Oriented Survey", meta: "共同作者 · Neurocomputing", tag: "审稿中" },
          { title: "Design & Control of Multi-Agent Robotic Systems for Extreme Environments", meta: "第一作者 · 受邀书章（撰写中）", tag: "撰写中" }
        ]
      },
      education: {
        title: "教育背景",
        items: [
          { degree: "博士 · 电气与电子工程", meta: "控制、机器人与人工智能方向 · 曼彻斯特大学 · 2024 至今" },
          { degree: "工学学士（荣誉）· 电气与电子工程，一等荣誉", meta: "曼彻斯特大学 · 2021 – 2024" }
        ]
      },
      experience: {
        title: "经历",
        items: [
          { role: "博士研究员（控制、机器人与人工智能方向）", org: "曼彻斯特大学", date: "2024 至今", desc: "面向自主寻源与多机器人协同搜索的探索-利用双重控制（DCEE）研究。" },
          { role: "研究生助教", org: "曼彻斯特大学", date: "2024 至今", desc: "承担控制、机器人与数字电子课程的实验、习题课与评分。" },
          { role: "客座讲师与实验设计者", org: "曼彻斯特大学", date: "2025", desc: "设计硕士过程控制实验（PLC ↔ MATLAB/Simulink，OPC 通信）并讲授。" },
          { role: "学术导师", org: "英国留学教育咨询机构", date: "2026 至今", desc: "辅导数学、物理与学术英语，指导研究计划（RP）与论文发表。" },
          { role: "博士导师 · The Brilliant Club", org: "The Brilliant Club（英国教育公益组织）", date: "2026 至今", desc: "通过 Scholars Programme 为弱势背景中学生讲授大学风格辅导课，助力高等教育公平。" }
        ]
      },
      skills: {
        title: "技术能力",
        groups: [
          { label: "控制与机器人", tags: ["双重控制 (DCEE)", "共识与编队", "主动寻源", "路径规划 (A*)", "多机器人协同", "ROS"] },
          { label: "编程", tags: ["Python", "C/C++", "MATLAB", "R", "VHDL"] },
          { label: "嵌入式与硬件", tags: ["STM32", "ESP32", "Arduino", "FPGA", "PCB 设计", "PLC"] },
          { label: "仿真与工具", tags: ["MATLAB/Simulink", "LabVIEW", "OpenCV", "PLECS", "Git", "LaTeX"] }
        ]
      },
      projects: {
        title: "项目",
        project1: { title: "自主寻源中的双重控制（DCEE）研究（2024年9月至今）", desc: "研究自主寻源中的不确定性感知决策，设计多机器人协同搜索算法，实现高效协调与目标定位。参与撰写协作 DCEE 策略研究论文，并在曼彻斯特大学电气电子工程研究生会议进行海报展示。" },
        project2: { title: "Hack-a-Bot 机器人挑战赛（2025年3月）", desc: "曼彻斯特大学与索尼联合举办的黑客马拉松。24小时内完成完整机器人平台：图像处理视觉管道（滤波、灰度化、二值化）、带动态重规划的A*路径规划、ArUco标记定位以及基于PID的轨迹跟踪，实现从任意起点出发的完整自主配送循环。" },
        project3: { title: "智能交通锥群体控制（2023年9月—2024年5月）", desc: "设计基于ESP32的机器人控制板，实现群体机器人控制与Zigbee无线通信，集成超声波传感器、电机驱动模块，并分别开发ESP32和STM32固件。" },
        project4: { title: "ESP Buggy — 基于STM32的自动循迹车（2022年9月—2023年5月）", desc: "作为团队负责人主导STM32自动循迹车的设计：涵盖电路设计、PCB布局、硬件集成、基于PID的控制算法以及双反馈系统。负责项目规划、进度安排及任务分配。" },
        project5: { title: "曼彻斯特大学与NVIDIA PuzzleThon — 计算机视觉（2024年3—4月）", desc: "使用Python和ROS为自动循迹车开发计算机视觉与深度学习功能，训练深度学习模型以识别并响应车载摄像头拍摄的交通信号与标志。" },
        project6: { title: "Hack-a-Bot 机器人挑战赛（2026年3月）", desc: "担任队长参加曼彻斯特大学与索尼联合举办的黑客马拉松。构建双机器人自主系统，实现目标定位、路径规划与协同推物，集成 ArUco 定位、A* 路径规划以及 Pure Pursuit 与 PID 控制，实现实时轨迹修正与同步协作。荣获季军。" },
        project7: { title: "OpenClaw × 伦敦帝国理工学院 黑客马拉松（2026年3月）", desc: "担任队长，搭建多智能体 AI 系统：由协调代理分配产品、市场、销售与运营任务，并设计代理之间的工具调用、技能分工与共享状态机制。" }
      },
      awards: {
        title: "荣誉与奖项",
        items: [
          { title: "🎓 2026 — 博士培养与发展支持基金（DTDSF）", desc: "曼彻斯特大学，2026年。" },
          { title: "🥉 2026 — 三等奖，Hack-a-Bot 机器人挑战赛", desc: "曼彻斯特大学机器人学会（RoboSoc），2026年3月。" },
          { title: "🥇 2025 — 海报一等奖，电气与电子工程研究生学术研讨会", desc: "曼彻斯特大学电气与电子工程系，2025年11月。" },
          { title: "🥇 2025 — 一等奖，Hack-a-Bot 机器人挑战赛", desc: "曼彻斯特大学与索尼联合举办的黑客马拉松，2025年3月。" },
          { title: "🥈 2024 — 二等奖，NVIDIA PuzzleThon", desc: "曼彻斯特大学与 NVIDIA，2024年3月。" },
          { title: "🥉 2023 — 三等奖，ESP Buggy 开发竞赛", desc: "曼彻斯特大学，2023年5月。" }
        ]
      },
      contact: { title: "联系方式", universityEmail: "学校邮箱", personalEmail: "个人邮箱", affiliation: "所属机构", website: "个人网站", github: "代码库", linkedin: "领英" },
      footer: { crafted: "采用流光玻璃界面精心制作。" },
      language: { label: "语言" }
    },

    en: {
      nav: { about: "About", research: "Research", publications: "Publications", projects: "Projects", experience: "Experience", awards: "Awards", contact: "Contact" },
      name: "Donglin Li (Dennis)",
      profile: {
        title: "PhD Candidate (2024-present)",
        rep: "EEE PhD Student Rep (2024-present)",
        affiliation: "EEE, The University of Manchester",
        cv: "CV", email: "Email", github: "GitHub", linkedin: "LinkedIn", updates: "Updates"
      },
      hero: { tagline: "Building robust multi-agent intelligence for real-world systems.", badge: "Available for collaboration", kicker: "PhD · Control, Robotics & AI · The University of Manchester" },
      stats: { papers: "First-author papers", awards: "Awards", honours: "BEng First-Class" },
      about: {
        title: "About Me",
        description: "I am a PhD researcher in Electrical and Electronic Engineering (Control, Robotics and AI) at The University of Manchester (2024-present), where I also completed my BEng in Electrical and Electronics Engineering with First Class Honours (2021-2024). My work focuses on distributed control, multi-robot coordination, and uncertainty-aware decision-making for autonomous systems. I also support teaching in control and robotics related courses as a Graduate Teaching Assistant, and serve as the EEE PhD Student Representative (Department Leader, 2024-present).",
        tags: ["Distributed Control", "Multi-Robot Systems", "Consensus & Formation", "Active Source Seeking", "Dual Control"]
      },
      research: {
        title: "Research Interests",
        interests: [
          "Distributed Bayesian active sensing for multi-robot source seeking under communication, safety, and computation constraints.",
          "Dual control for exploration–exploitation (DCEE) with persistence-of-excitation– and Fisher-information–aware information gathering.",
          "Communication-efficient cooperation: event-triggered fusion and source seeking under switching or lossy network topologies.",
          "Learning-augmented, multi-modal autonomous search: RL/world-model planning, joint localization, and LLM-grounded coordination."
        ]
      },
      publications: {
        title: "Publications",
        items: [
          { title: "Dual Control for Multi-Robot Source Seeking with Consensus Mean Fusion and Safety Projection", meta: "First author · 45th Chinese Control Conference (CCC 2026), Changsha", tag: "Accepted" },
          { title: "Trace Weighted Event-Triggered Mean Fusion for Efficient Multi-Robot Source Seeking", meta: "First author · 8th Int. Conf. on Industrial AI (IAI 2026), Shenyang", tag: "Under review" },
          { title: "Multi-Objective Pipeline Scheduling for LLM Inference in Heterogeneous DePIN", meta: "Co-author · IFAC World Congress 2026, Busan", tag: "Accepted" },
          { title: "Load Balancing for LLM Inference Serving: A Control and Learning Oriented Survey", meta: "Co-author · Neurocomputing", tag: "Under review" },
          { title: "Design & Control of Multi-Agent Robotic Systems for Extreme Environments", meta: "Lead author · invited book chapter (in preparation)", tag: "In prep." }
        ]
      },
      education: {
        title: "Education",
        items: [
          { degree: "PhD — Electrical & Electronic Engineering", meta: "Control, Robotics & AI · The University of Manchester · 2024 – present" },
          { degree: "BEng (Hons) — Electrical & Electronic Engineering, First Class", meta: "The University of Manchester · 2021 – 2024" }
        ]
      },
      experience: {
        title: "Experience",
        items: [
          { role: "PhD Researcher — Control, Robotics & AI", org: "The University of Manchester", date: "2024 – present", desc: "Dual control (DCEE) for autonomous source seeking and multi-robot cooperative search." },
          { role: "Graduate Teaching Assistant", org: "The University of Manchester", date: "2024 – present", desc: "Labs, tutorials and assessment across control, robotics and digital-electronics courses." },
          { role: "Guest Lecturer & Experiment Designer", org: "The University of Manchester", date: "2025", desc: "Built an MSc process-control experiment (PLC ↔ MATLAB/Simulink over OPC) and delivered guest lectures." },
          { role: "Academic Tutor", org: "UK study-abroad education consultancy", date: "2026 – present", desc: "Tutor mathematics, physics and academic English; mentor postgraduate research proposals and publication." },
          { role: "PhD Tutor — The Brilliant Club", org: "The Brilliant Club (widening-participation charity)", date: "2026 – present", desc: "Deliver university-style tutorials to school pupils from under-represented backgrounds (Scholars Programme), supporting access to higher education." }
        ]
      },
      skills: {
        title: "Technical Skills",
        groups: [
          { label: "Control & Robotics", tags: ["Dual Control (DCEE)", "Consensus & Formation", "Source Seeking", "Path Planning (A*)", "Multi-Robot Coordination", "ROS"] },
          { label: "Programming", tags: ["Python", "C/C++", "MATLAB", "R", "VHDL"] },
          { label: "Embedded & Hardware", tags: ["STM32", "ESP32", "Arduino", "FPGA", "PCB Design", "PLC"] },
          { label: "Simulation & Tools", tags: ["MATLAB/Simulink", "LabVIEW", "OpenCV", "PLECS", "Git", "LaTeX"] }
        ]
      },
      projects: {
        title: "Projects",
        project1: { title: "Dual Control for Exploration & Exploitation (DCEE) in Autonomous Source Seeking (Sept 2024–present)", desc: "Investigated uncertainty-aware decision-making for autonomous source seeking using DCEE. Designed multi-robot cooperative search algorithms for efficient coordination and target localisation. Contributed to a research paper on cooperative DCEE strategies; presented findings at the EEE Postgraduate Research Conference, University of Manchester." },
        project2: { title: "Hack-a-Bot Robotics Challenge (Mar 2025)", desc: "UoM & Sony joint hackathon. Built a full robotics platform in 24 hours: OpenCV vision pipeline (filtering, binarisation), A* path planning with dynamic re-routing, ArUco marker localisation, and PID trajectory tracking. Achieved a complete autonomous delivery cycle from any start point." },
        project3: { title: "Smart Traffic Cones Swarm Control (Sept 2023–May 2024)", desc: "Designed an ESP32-based robot control board with group robot control and Zigbee communication. Integrated ultrasonic sensors, motor drivers, and developed firmware for ESP32 and STM32." },
        project4: { title: "ESP Buggy — STM32 Autonomous Tracking Car (Sept 2022–May 2023)", desc: "Led design of an STM32-based automatic tracking car as team lead: circuit design, PCB layout, hardware integration, PID-based control, and dual feedback system. Managed project planning and task allocation." },
        project5: { title: "UoM & NVIDIA PuzzleThon — Computer Vision (Mar–Apr 2024)", desc: "Developed computer vision and deep learning functions for an autonomous line-tracking car using Python and ROS. Trained deep learning models to detect and respond to traffic signals from on-board cameras." },
        project6: { title: "Hack-a-Bot Robotics Challenge (Mar 2026)", desc: "Team captain at the UoM & Sony hackathon. Built a dual-robot autonomous system for target localisation, path planning and cooperative object pushing — integrating ArUco localisation, A* planning, and Pure Pursuit + PID control with real-time trajectory correction and synchronised operation. Awarded Third Prize." },
        project7: { title: "OpenClaw × Imperial College London Hackathon (Mar 2026)", desc: "Team captain building a multi-agent AI system in which a coordinator agent delegates product, marketing, sales and operations tasks. Designed inter-agent tool-calling, role specialisation and a shared-state mechanism." }
      },
      awards: {
        title: "Honours & Awards",
        items: [
          { title: "🎓 2026 — Doctoral Training & Development Support Fund (DTDSF)", desc: "The University of Manchester. 2026." },
          { title: "🥉 2026 — Third Prize, Hack-a-Bot Robotics Challenge", desc: "UoM RoboSoc. March 2026." },
          { title: "🥇 2025 — First Place Poster Prize, EEE Postgraduate Research Conference", desc: "Department of Electrical and Electronic Engineering, The University of Manchester. November 2025." },
          { title: "🥇 2025 — First Prize, Hack-a-Bot Robotics Challenge", desc: "The University of Manchester & Sony joint hackathon. March 2025." },
          { title: "🥈 2024 — Second Prize, NVIDIA PuzzleThon", desc: "The University of Manchester & NVIDIA. March 2024." },
          { title: "🥉 2023 — Third Prize, ESP Buggy Development Competition", desc: "The University of Manchester. May 2023." }
        ]
      },
      contact: { title: "Contact", universityEmail: "University Email", personalEmail: "Personal Email", affiliation: "Affiliation", website: "Website", github: "GitHub", linkedin: "LinkedIn" },
      footer: { crafted: "Crafted with a liquid-glass inspired interface." },
      language: { label: "Language" }
    },

    de: {
      nav: { about: "Über mich", research: "Forschung", publications: "Publikationen", projects: "Projekte", experience: "Erfahrung", awards: "Auszeichnungen", contact: "Kontakt" },
      name: "Donglin Li (Dennis)",
      profile: {
        title: "Doktorand (2024–heute)",
        rep: "EEE Doktorandenvertreter (2024–heute)",
        affiliation: "Elektrotechnik, Universität Manchester",
        cv: "Lebenslauf", email: "E-Mail", github: "GitHub", linkedin: "LinkedIn", updates: "Neuigkeiten"
      },
      hero: { tagline: "Robuste Multi-Agenten-Intelligenz für reale Systeme entwickeln.", badge: "Offen für Kooperationen", kicker: "Promotion · Regelung, Robotik & KI · Universität Manchester" },
      stats: { papers: "Erstautor-Arbeiten", awards: "Auszeichnungen", honours: "BEng mit Auszeichnung" },
      about: {
        title: "Über mich",
        description: "Ich bin Doktorand im Bereich Elektro- und Elektronikingenieurwesen (Regelungstechnik, Robotik und KI) an der Universität Manchester (2024–heute), wo ich zuvor meinen BEng in Elektro- und Elektronikingenieurwesen mit Auszeichnung (First Class Honours) abgeschlossen habe (2021–2024). Meine Forschung konzentriert sich auf verteilte Regelung, Koordination mehrerer Roboter und unsicherheitsbewusste Entscheidungsfindung für autonome Systeme. Außerdem bin ich als wissenschaftlicher Lehrbeauftragter für Lehrveranstaltungen zu Regelungstechnik und Robotik tätig und fungiere als Doktorandenvertreter des Fachbereichs EEE (Abteilungsleiter, 2024–heute).",
        tags: ["Verteilte Regelung", "Mehrrobotersysteme", "Konsens & Formation", "Aktive Quellsuche", "Duale Regelung"]
      },
      research: {
        title: "Forschungsinteressen",
        interests: [
          "Verteilte Bayessche aktive Erkundung für die kooperative Quellsuche mit mehreren Robotern – unter Beschränkungen bei Kommunikation, Sicherheit und Rechenleistung.",
          "Duale Regelung zur Balance von Exploration und Exploitation (DCEE), bei der die Informationsgewinnung gezielt auf Anregungsgüte (Persistence of Excitation) und Fisher-Information ausgerichtet wird.",
          "Kommunikationssparsame Kooperation: ereignisgesteuerte Fusion und Quellsuche auch bei wechselnden oder unzuverlässigen Netzwerktopologien.",
          "Lerngestützte, multimodale autonome Suche: Planung mit Reinforcement Learning bzw. Weltmodellen, kooperative Lokalisierung und LLM-gestützte Koordination."
        ]
      },
      publications: {
        title: "Publikationen",
        items: [
          { title: "Dual Control for Multi-Robot Source Seeking with Consensus Mean Fusion and Safety Projection", meta: "Erstautor · 45. Chinese Control Conference (CCC 2026), Changsha", tag: "Angenommen" },
          { title: "Trace Weighted Event-Triggered Mean Fusion for Efficient Multi-Robot Source Seeking", meta: "Erstautor · 8. Int. Conf. on Industrial AI (IAI 2026), Shenyang", tag: "In Begutachtung" },
          { title: "Multi-Objective Pipeline Scheduling for LLM Inference in Heterogeneous DePIN", meta: "Co-Autor · IFAC-Weltkongress 2026, Busan", tag: "Angenommen" },
          { title: "Load Balancing for LLM Inference Serving: A Control and Learning Oriented Survey", meta: "Co-Autor · Neurocomputing", tag: "In Begutachtung" },
          { title: "Design & Control of Multi-Agent Robotic Systems for Extreme Environments", meta: "Erstautor · eingeladenes Buchkapitel (in Arbeit)", tag: "In Arbeit" }
        ]
      },
      education: {
        title: "Ausbildung",
        items: [
          { degree: "Promotion — Elektro- und Elektronikingenieurwesen", meta: "Regelung, Robotik & KI · Universität Manchester · 2024 – heute" },
          { degree: "BEng (Hons) — Elektro- und Elektronikingenieurwesen, First Class", meta: "Universität Manchester · 2021 – 2024" }
        ]
      },
      experience: {
        title: "Erfahrung",
        items: [
          { role: "Doktorand — Regelung, Robotik & KI", org: "Universität Manchester", date: "2024 – heute", desc: "Duale Regelung (DCEE) für autonome Quellsuche und kooperative Mehrrobotersuche." },
          { role: "Wissenschaftlicher Lehrbeauftragter", org: "Universität Manchester", date: "2024 – heute", desc: "Praktika, Tutorien und Bewertung in Regelungstechnik, Robotik und Digitaltechnik." },
          { role: "Gastdozent & Versuchsentwickler", org: "Universität Manchester", date: "2025", desc: "MSc-Prozessregelungsversuch (PLC ↔ MATLAB/Simulink über OPC) entwickelt und Vorlesungen gehalten." },
          { role: "Akademischer Tutor", org: "Britische Bildungsberatung für Auslandsstudium", date: "2026 – heute", desc: "Mathematik, Physik und akademisches Englisch; Betreuung von Forschungsanträgen und Publikationen." },
          { role: "PhD-Tutor — The Brilliant Club", org: "The Brilliant Club (Bildungs-Wohltätigkeitsorganisation)", date: "2026 – heute", desc: "Universitätsähnliche Tutorien für Schülerinnen und Schüler aus unterrepräsentierten Gruppen (Scholars Programme) zur Förderung des Hochschulzugangs." }
        ]
      },
      skills: {
        title: "Technische Kompetenzen",
        groups: [
          { label: "Regelung & Robotik", tags: ["Duale Regelung (DCEE)", "Konsens & Formation", "Quellsuche", "Pfadplanung (A*)", "Mehrroboter-Koordination", "ROS"] },
          { label: "Programmierung", tags: ["Python", "C/C++", "MATLAB", "R", "VHDL"] },
          { label: "Eingebettete Systeme & Hardware", tags: ["STM32", "ESP32", "Arduino", "FPGA", "PCB-Design", "SPS"] },
          { label: "Simulation & Werkzeuge", tags: ["MATLAB/Simulink", "LabVIEW", "OpenCV", "PLECS", "Git", "LaTeX"] }
        ]
      },
      projects: {
        title: "Projekte",
        project1: { title: "Duale Regelung für Exploration & Exploitation (DCEE) bei der autonomen Quellsuche (Sep. 2024–heute)", desc: "Untersuchung unsicherheitsbewusster Entscheidungsfindung bei der autonomen Quellsuche mittels DCEE. Entwurf kooperativer Mehrroboter-Suchalgorithmen für effiziente Koordination und Ziellokalisierung. Mitarbeit an einem Forschungsartikel über kooperative DCEE-Strategien; Präsentation der Ergebnisse auf der EEE-Forschungskonferenz für Promovierende der Universität Manchester." },
        project2: { title: "Hack-a-Bot Robotik-Wettbewerb (März 2025)", desc: "Gemeinsamer Hackathon der Universität Manchester und Sony. Vollständige Roboterplattform in 24 Stunden entwickelt: Bildverarbeitungs-Pipeline (Filterung, Binärisierung), A*-Pfadplanung mit dynamischer Neuplanung, ArUco-Markerlokalisierung und PID-basierte Trajektorienverfolgung. Vollständiger autonomer Lieferzyklus von beliebigem Startpunkt realisiert." },
        project3: { title: "Schwarmsteuerung intelligenter Verkehrskegel (Sep. 2023–Mai 2024)", desc: "Entwurf einer ESP32-basierten Robotersteuerplatine mit Gruppenrobotersteuerung und Zigbee-Kommunikation. Integration von Ultraschallsensoren, Motortreibern sowie Entwicklung von Firmware für ESP32 und STM32." },
        project4: { title: "ESP Buggy — Autonomes Spurverfolgungsfahrzeug auf STM32-Basis (Sep. 2022–Mai 2023)", desc: "Als Teamleiter die Entwicklung eines STM32-basierten automatischen Spurverfolgungsfahrzeugs geleitet: Schaltkreisdesign, Leiterplattenentwicklung, Hardwareintegration, PID-basierte Regelung und duales Rückkopplungssystem. Verantwortlich für Projektplanung, Zeitplanung und Aufgabenverteilung." },
        project5: { title: "Universität Manchester & NVIDIA PuzzleThon — Computer Vision (März–Apr. 2024)", desc: "Entwicklung von Bildverarbeitungs- und Deep-Learning-Funktionen für ein autonomes Spurverfolgungsfahrzeug mit Python und ROS. Training von Deep-Learning-Modellen zur Erkennung und Reaktion auf Verkehrssignale aus bordeigenen Kameras." },
        project6: { title: "Hack-a-Bot Robotik-Wettbewerb (März 2026)", desc: "Als Teamleiter beim gemeinsamen Hackathon der Universität Manchester und Sony. Entwicklung eines autonomen Doppelroboter-Systems für Ziellokalisierung, Pfadplanung und kooperatives Schieben von Objekten – mit ArUco-Lokalisierung, A*-Planung sowie Pure-Pursuit- und PID-Regelung für Echtzeit-Trajektorienkorrektur und synchronisierten Betrieb. Mit dem dritten Preis ausgezeichnet." },
        project7: { title: "OpenClaw × Imperial College London Hackathon (März 2026)", desc: "Als Teamleiter Aufbau eines Multi-Agenten-KI-Systems, in dem ein Koordinator-Agent Aufgaben aus Produkt, Marketing, Vertrieb und Betrieb verteilt. Entwurf von Tool-Aufrufen zwischen Agenten, Rollenspezialisierung und einem Mechanismus für gemeinsamen Zustand." }
      },
      awards: {
        title: "Auszeichnungen & Preise",
        items: [
          { title: "🎓 2026 — Doctoral Training and Development Support Fund (DTDSF)", desc: "Universität Manchester. 2026." },
          { title: "🥉 2026 — Dritter Preis, Hack-a-Bot Robotik-Wettbewerb", desc: "UoM RoboSoc. März 2026." },
          { title: "🥇 2025 — Erster Platz (Posterpreis), Doktorandenkonferenz der Elektrotechnik", desc: "Fachbereich Elektro- und Elektronikingenieurwesen, Universität Manchester. November 2025." },
          { title: "🥇 2025 — Erster Preis, Hack-a-Bot Robotik-Wettbewerb", desc: "Gemeinsamer Hackathon der Universität Manchester und Sony. März 2025." },
          { title: "🥈 2024 — Zweiter Preis, NVIDIA PuzzleThon", desc: "Universität Manchester & NVIDIA. März 2024." },
          { title: "🥉 2023 — Dritter Preis, ESP-Buggy-Entwicklungswettbewerb", desc: "Universität Manchester. Mai 2023." }
        ]
      },
      contact: { title: "Kontakt", universityEmail: "Uni-E-Mail", personalEmail: "Private E-Mail", affiliation: "Institution", website: "Webseite", github: "GitHub", linkedin: "LinkedIn" },
      footer: { crafted: "Gestaltet mit einer Flüssigglas-inspirierten Oberfläche." },
      language: { label: "Sprache" }
    },

    ru: {
      nav: { about: "О себе", research: "Исследования", publications: "Публикации", projects: "Проекты", experience: "Опыт", awards: "Награды", contact: "Контакты" },
      name: "Donglin Li (Dennis)",
      profile: {
        title: "Аспирант (2024–н.в.)",
        rep: "Представитель аспирантов EEE (2024–н.в.)",
        affiliation: "Электротехнический факультет, Манчестерский университет",
        cv: "Резюме", email: "Эл. почта", github: "GitHub", linkedin: "LinkedIn", updates: "Обновления"
      },
      hero: { tagline: "Создание устойчивого мультиагентного интеллекта для реальных систем.", badge: "Открыт к сотрудничеству", kicker: "Аспирант · Управление, робототехника и ИИ · Манчестерский университет" },
      stats: { papers: "Статьи первого автора", awards: "Награды", honours: "Диплом с отличием" },
      about: {
        title: "Обо мне",
        description: "Я аспирант факультета электротехники и электроники (управление, робототехника и ИИ) Манчестерского университета (2024–н.в.), где ранее получил степень бакалавра электротехники с отличием (First Class Honours, 2021–2024). Мои исследования посвящены распределённому управлению, координации нескольких роботов и принятию решений в условиях неопределённости для автономных систем. Также работаю ассистентом преподавателя на курсах по теории управления и робототехнике и являюсь представителем аспирантов факультета EEE (руководитель направления, 2024–н.в.).",
        tags: ["Распределённое управление", "Многороботные системы", "Консенсус и строй", "Активный поиск источника", "Двойное управление"]
      },
      research: {
        title: "Научные интересы",
        interests: [
          "Распределённое байесовское активное зондирование для кооперативного поиска источника группой роботов — с учётом ограничений на связь, безопасность и вычисления.",
          "Двойное управление по принципу «исследование–использование» (DCEE), в котором сбор информации опирается на богатство возбуждения (persistence of excitation) и информацию Фишера.",
          "Экономная по объёму связи кооперация: событийно-триггерное слияние данных и поиск источника даже при переключающихся или ненадёжных топологиях сети.",
          "Автономный поиск с обучением и мультимодальностью: планирование на основе обучения с подкреплением и мировых моделей, совместная локализация и координация с участием больших языковых моделей."
        ]
      },
      publications: {
        title: "Публикации",
        items: [
          { title: "Dual Control for Multi-Robot Source Seeking with Consensus Mean Fusion and Safety Projection", meta: "Первый автор · 45-я Китайская конференция по управлению (CCC 2026), Чанша", tag: "Принято" },
          { title: "Trace Weighted Event-Triggered Mean Fusion for Efficient Multi-Robot Source Seeking", meta: "Первый автор · 8-я Межд. конф. по промышленному ИИ (IAI 2026), Шэньян", tag: "На рецензии" },
          { title: "Multi-Objective Pipeline Scheduling for LLM Inference in Heterogeneous DePIN", meta: "Соавтор · Всемирный конгресс IFAC 2026, Пусан", tag: "Принято" },
          { title: "Load Balancing for LLM Inference Serving: A Control and Learning Oriented Survey", meta: "Соавтор · Neurocomputing", tag: "На рецензии" },
          { title: "Design & Control of Multi-Agent Robotic Systems for Extreme Environments", meta: "Первый автор · приглашённая глава книги (в подготовке)", tag: "В подготовке" }
        ]
      },
      education: {
        title: "Образование",
        items: [
          { degree: "PhD — Электротехника и электроника", meta: "Управление, робототехника и ИИ · Манчестерский университет · 2024 – н.в." },
          { degree: "BEng (Hons) — Электротехника и электроника, диплом с отличием", meta: "Манчестерский университет · 2021 – 2024" }
        ]
      },
      experience: {
        title: "Опыт",
        items: [
          { role: "Научный сотрудник (PhD) — управление, робототехника и ИИ", org: "Манчестерский университет", date: "2024 – н.в.", desc: "Двойное управление (DCEE) для автономного поиска источника и кооперативного поиска несколькими роботами." },
          { role: "Ассистент преподавателя", org: "Манчестерский университет", date: "2024 – н.в.", desc: "Лабораторные, семинары и оценивание по управлению, робототехнике и цифровой электронике." },
          { role: "Приглашённый лектор и разработчик экспериментов", org: "Манчестерский университет", date: "2025", desc: "Создан MSc-эксперимент по управлению процессами (PLC ↔ MATLAB/Simulink через OPC); проведены лекции." },
          { role: "Академический тьютор", org: "Британское агентство образования за рубежом", date: "2026 – н.в.", desc: "Математика, физика и академический английский; наставничество по исследовательским заявкам и публикациям." },
          { role: "PhD-тьютор — The Brilliant Club", org: "The Brilliant Club (образовательная благотворительная организация)", date: "2026 – н.в.", desc: "Университетские тьюториалы для школьников из недопредставленных групп (Scholars Programme), расширение доступа к высшему образованию." }
        ]
      },
      skills: {
        title: "Технические навыки",
        groups: [
          { label: "Управление и робототехника", tags: ["Двойное управление (DCEE)", "Консенсус и строй", "Поиск источника", "Планирование пути (A*)", "Координация роботов", "ROS"] },
          { label: "Программирование", tags: ["Python", "C/C++", "MATLAB", "R", "VHDL"] },
          { label: "Встраиваемые системы и аппаратура", tags: ["STM32", "ESP32", "Arduino", "FPGA", "Проектирование плат", "ПЛК"] },
          { label: "Моделирование и инструменты", tags: ["MATLAB/Simulink", "LabVIEW", "OpenCV", "PLECS", "Git", "LaTeX"] }
        ]
      },
      projects: {
        title: "Проекты",
        project1: { title: "Двойное управление для исследования и эксплуатации (DCEE) при автономном поиске источника (сент. 2024–н.в.)", desc: "Исследование принятия решений в условиях неопределённости при автономном поиске источника с использованием DCEE. Разработка алгоритмов кооперативного поиска несколькими роботами для эффективной координации и обнаружения цели. Участие в написании статьи о стратегиях кооперативного DCEE; представление результатов на конференции аспирантов факультета EEE Манчестерского университета." },
        project2: { title: "Робототехнический конкурс Hack-a-Bot (март 2025)", desc: "Совместный хакатон Манчестерского университета и Sony. За 24 часа создана полноценная роботизированная платформа: конвейер компьютерного зрения (фильтрация, бинаризация), планирование пути А* с динамической перестройкой, локализация по маркерам ArUco и ПИД-управление траекторией. Реализован полный автономный цикл доставки из любой начальной точки." },
        project3: { title: "Роевое управление умными дорожными конусами (сент. 2023–май 2024)", desc: "Разработана управляющая плата на основе ESP32 с групповым управлением роботами и беспроводной связью Zigbee. Интегрированы ультразвуковые датчики, драйверы двигателей, разработана прошивка для ESP32 и STM32." },
        project4: { title: "ESP Buggy — автоматический трекер на базе STM32 (сент. 2022–май 2023)", desc: "В роли руководителя команды разработал автоматический трекер на STM32: схемотехника, проектирование печатной платы, интеграция аппаратуры, ПИД-управление и двойная система обратной связи. Отвечал за планирование проекта, составление графика и распределение задач." },
        project5: { title: "Манчестерский университет & NVIDIA PuzzleThon — компьютерное зрение (март–апр. 2024)", desc: "Разработал функции компьютерного зрения и глубокого обучения для автономного трекера с использованием Python и ROS. Обучил модели глубокого обучения для распознавания дорожных знаков и сигналов с бортовых камер." },
        project6: { title: "Робототехнический конкурс Hack-a-Bot (март 2026)", desc: "Капитан команды на совместном хакатоне Манчестерского университета и Sony. Создана автономная система из двух роботов для локализации цели, планирования пути и совместного перемещения объектов: локализация по маркерам ArUco, планирование A*, управление Pure Pursuit и ПИД с коррекцией траектории в реальном времени и синхронной работой. Удостоен третьего места." },
        project7: { title: "OpenClaw × хакатон Imperial College London (март 2026)", desc: "Капитан команды; создание мультиагентной ИИ-системы, в которой агент-координатор распределяет задачи по продукту, маркетингу, продажам и операциям. Разработаны вызовы инструментов между агентами, специализация ролей и механизм общего состояния." }
      },
      awards: {
        title: "Достижения и награды",
        items: [
          { title: "🎓 2026 — Doctoral Training and Development Support Fund (DTDSF)", desc: "Манчестерский университет. 2026." },
          { title: "🥉 2026 — Третье место, робототехнический конкурс Hack-a-Bot", desc: "UoM RoboSoc. Март 2026." },
          { title: "🥇 2025 — Первое место (постер), конференция аспирантов электротехнического факультета", desc: "Факультет электротехники и электроники, Манчестерский университет. Ноябрь 2025." },
          { title: "🥇 2025 — Первое место, робототехнический конкурс Hack-a-Bot", desc: "Совместный хакатон Манчестерского университета и Sony. Март 2025." },
          { title: "🥈 2024 — Второе место, NVIDIA PuzzleThon", desc: "Манчестерский университет и NVIDIA. Март 2024." },
          { title: "🥉 2023 — Третье место, конкурс разработки ESP Buggy", desc: "Манчестерский университет. Май 2023." }
        ]
      },
      contact: { title: "Контакты", universityEmail: "Университетская почта", personalEmail: "Личная почта", affiliation: "Место работы", website: "Сайт", github: "GitHub", linkedin: "LinkedIn" },
      footer: { crafted: "Создано с интерфейсом в стиле жидкого стекла." },
      language: { label: "Язык" }
    },

    fr: {
      nav: { about: "À propos", research: "Recherche", publications: "Publications", projects: "Projets", experience: "Expérience", awards: "Prix", contact: "Contact" },
      name: "Donglin Li (Dennis)",
      profile: {
        title: "Doctorant (2024–présent)",
        rep: "Représentant des doctorants EEE (2024–présent)",
        affiliation: "Génie électrique, Université de Manchester",
        cv: "CV", email: "E-mail", github: "GitHub", linkedin: "LinkedIn", updates: "Actualités"
      },
      hero: { tagline: "Développer une intelligence multi-agents robuste pour les systèmes réels.", badge: "Disponible pour collaborations", kicker: "Doctorat · Contrôle, Robotique & IA · Université de Manchester" },
      stats: { papers: "Articles 1er auteur", awards: "Distinctions", honours: "Licence mention TB" },
      about: {
        title: "À propos de moi",
        description: "Je suis doctorant en génie électrique et électronique (contrôle, robotique et IA) à l'Université de Manchester (2024–présent), où j'ai également obtenu mon BEng en génie électrique et électronique avec mention très bien (First Class Honours, 2021–2024). Mes travaux portent sur le contrôle distribué, la coordination multi-robots et la prise de décision en conditions d'incertitude pour les systèmes autonomes. Je suis également chargé d'enseignement pour les cours de contrôle et de robotique, et assure la représentation des doctorants du département EEE (chef de département, 2024–présent).",
        tags: ["Contrôle distribué", "Systèmes multi-robots", "Consensus et formation", "Recherche de source active", "Contrôle dual"]
      },
      research: {
        title: "Intérêts de recherche",
        interests: [
          "Perception active bayésienne distribuée pour la recherche coopérative de source par plusieurs robots, sous contraintes de communication, de sécurité et de calcul.",
          "Contrôle dual exploration–exploitation (DCEE) dont la collecte d'information s'appuie sur la persistance d'excitation et l'information de Fisher.",
          "Coopération sobre en communication : fusion déclenchée par événements et recherche de source même sur des réseaux à topologie variable ou peu fiable.",
          "Recherche autonome augmentée par l'apprentissage et multimodale : planification par apprentissage par renforcement ou modèles du monde, localisation coopérative et coordination guidée par de grands modèles de langage."
        ]
      },
      publications: {
        title: "Publications",
        items: [
          { title: "Dual Control for Multi-Robot Source Seeking with Consensus Mean Fusion and Safety Projection", meta: "Premier auteur · 45e Chinese Control Conference (CCC 2026), Changsha", tag: "Accepté" },
          { title: "Trace Weighted Event-Triggered Mean Fusion for Efficient Multi-Robot Source Seeking", meta: "Premier auteur · 8e Int. Conf. on Industrial AI (IAI 2026), Shenyang", tag: "En évaluation" },
          { title: "Multi-Objective Pipeline Scheduling for LLM Inference in Heterogeneous DePIN", meta: "Co-auteur · Congrès mondial IFAC 2026, Busan", tag: "Accepté" },
          { title: "Load Balancing for LLM Inference Serving: A Control and Learning Oriented Survey", meta: "Co-auteur · Neurocomputing", tag: "En évaluation" },
          { title: "Design & Control of Multi-Agent Robotic Systems for Extreme Environments", meta: "Premier auteur · chapitre d'ouvrage invité (en préparation)", tag: "En préparation" }
        ]
      },
      education: {
        title: "Formation",
        items: [
          { degree: "Doctorat — Génie électrique et électronique", meta: "Contrôle, Robotique & IA · Université de Manchester · 2024 – présent" },
          { degree: "BEng (Hons) — Génie électrique et électronique, mention très bien", meta: "Université de Manchester · 2021 – 2024" }
        ]
      },
      experience: {
        title: "Expérience",
        items: [
          { role: "Doctorant — Automatique, Robotique & IA", org: "Université de Manchester", date: "2024 – présent", desc: "Contrôle dual (DCEE) pour la recherche autonome de source et la recherche coopérative multi-robots." },
          { role: "Assistant d'enseignement", org: "Université de Manchester", date: "2024 – présent", desc: "Travaux pratiques, tutoriels et évaluation en contrôle, robotique et électronique numérique." },
          { role: "Conférencier invité & concepteur d'expériences", org: "Université de Manchester", date: "2025", desc: "Conception d'un TP de contrôle de procédés (PLC ↔ MATLAB/Simulink via OPC) et cours magistraux." },
          { role: "Tuteur académique", org: "Cabinet britannique de conseil en études à l'étranger", date: "2026 – présent", desc: "Mathématiques, physique et anglais académique ; encadrement de projets de recherche et de publication." },
          { role: "Tuteur doctorant — The Brilliant Club", org: "The Brilliant Club (association éducative)", date: "2026 – présent", desc: "Tutoriels de niveau universitaire pour des élèves issus de milieux sous-représentés (Scholars Programme), favorisant l'accès à l'enseignement supérieur." }
        ]
      },
      skills: {
        title: "Compétences techniques",
        groups: [
          { label: "Contrôle & Robotique", tags: ["Contrôle dual (DCEE)", "Consensus & formation", "Recherche de source", "Planification (A*)", "Coordination multi-robots", "ROS"] },
          { label: "Programmation", tags: ["Python", "C/C++", "MATLAB", "R", "VHDL"] },
          { label: "Embarqué & Matériel", tags: ["STM32", "ESP32", "Arduino", "FPGA", "Conception PCB", "Automate (PLC)"] },
          { label: "Simulation & Outils", tags: ["MATLAB/Simulink", "LabVIEW", "OpenCV", "PLECS", "Git", "LaTeX"] }
        ]
      },
      projects: {
        title: "Projets",
        project1: { title: "Contrôle dual pour l'exploration et l'exploitation (DCEE) dans la recherche autonome de source (sept. 2024–présent)", desc: "Recherche sur la prise de décision en conditions d'incertitude pour la recherche autonome de source à l'aide du DCEE. Conception d'algorithmes de recherche coopérative multi-robots pour une coordination efficace et une localisation de cible. Contribution à un article sur les stratégies DCEE coopératives ; présentation des résultats à la conférence de recherche des doctorants EEE de l'Université de Manchester." },
        project2: { title: "Concours de robotique Hack-a-Bot (mars 2025)", desc: "Hackathon conjoint Université de Manchester & Sony. Plateforme robotique complète développée en 24 heures : pipeline de traitement d'image (filtrage, binarisation), planification de chemin A* avec recalcul dynamique, localisation par marqueurs ArUco et suivi de trajectoire PID. Cycle de livraison autonome complet réalisé depuis n'importe quel point de départ." },
        project3: { title: "Contrôle en essaim de cônes de signalisation intelligents (sept. 2023–mai 2024)", desc: "Conception d'une carte de contrôle robotique à base d'ESP32 avec gestion de groupe et communication Zigbee. Intégration de capteurs à ultrasons, de pilotes de moteurs et développement de micrologiciels pour ESP32 et STM32." },
        project4: { title: "ESP Buggy — Véhicule autonome de suivi de trajectoire sur STM32 (sept. 2022–mai 2023)", desc: "Direction de la conception d'un véhicule de suivi automatique à base de STM32 en tant que chef d'équipe : schéma électronique, conception de circuit imprimé, intégration matérielle, contrôle PID et double système de rétroaction. Gestion de la planification du projet, du calendrier et de la répartition des tâches." },
        project5: { title: "Université de Manchester & NVIDIA PuzzleThon — vision par ordinateur (mars–avr. 2024)", desc: "Développement de fonctions de vision par ordinateur et d'apprentissage profond pour un véhicule de suivi autonome en Python et ROS. Entraînement de modèles d'apprentissage profond pour la détection des signaux de circulation à partir des caméras embarquées." },
        project6: { title: "Concours de robotique Hack-a-Bot (mars 2026)", desc: "Capitaine d'équipe au hackathon conjoint Université de Manchester & Sony. Conception d'un système autonome à deux robots pour la localisation de cible, la planification de chemin et le déplacement coopératif d'objets : localisation par marqueurs ArUco, planification A*, contrôle Pure Pursuit et PID avec correction de trajectoire en temps réel et fonctionnement synchronisé. Récompensé par le troisième prix." },
        project7: { title: "OpenClaw × Hackathon Imperial College London (mars 2026)", desc: "Capitaine d'équipe ; construction d'un système d'IA multi-agents où un agent coordinateur répartit les tâches de produit, marketing, ventes et opérations. Conception des appels d'outils entre agents, de la spécialisation des rôles et d'un mécanisme d'état partagé." }
      },
      awards: {
        title: "Distinctions & Prix",
        items: [
          { title: "🎓 2026 — Doctoral Training and Development Support Fund (DTDSF)", desc: "Université de Manchester. 2026." },
          { title: "🥉 2026 — Troisième Prix, Concours de robotique Hack-a-Bot", desc: "UoM RoboSoc. Mars 2026." },
          { title: "🥇 2025 — Premier Prix Poster, Conférence de recherche des doctorants en génie électrique", desc: "Département de génie électrique et électronique, Université de Manchester. Novembre 2025." },
          { title: "🥇 2025 — Premier Prix, Concours de robotique Hack-a-Bot", desc: "Hackathon conjoint Université de Manchester & Sony. Mars 2025." },
          { title: "🥈 2024 — Deuxième Prix, NVIDIA PuzzleThon", desc: "Université de Manchester & NVIDIA. Mars 2024." },
          { title: "🥉 2023 — Troisième Prix, Concours de développement ESP Buggy", desc: "Université de Manchester. Mai 2023." }
        ]
      },
      contact: { title: "Contact", universityEmail: "E-mail universitaire", personalEmail: "E-mail personnel", affiliation: "Établissement", website: "Site web", github: "GitHub", linkedin: "LinkedIn" },
      footer: { crafted: "Conçu avec une interface inspirée du verre liquide." },
      language: { label: "Langue" }
    },

    'en-US': {
      nav: { about: "About", research: "Research", publications: "Publications", projects: "Projects", experience: "Experience", awards: "Awards", contact: "Contact" },
      name: "Donglin Li (Dennis)",
      profile: {
        title: "PhD Candidate (2024-present)",
        rep: "EEE PhD Student Rep (2024-present)",
        affiliation: "EEE, The University of Manchester",
        cv: "CV", email: "Email", github: "GitHub", linkedin: "LinkedIn", updates: "Updates"
      },
      hero: { tagline: "Building robust multi-agent intelligence for real-world systems.", badge: "Open to collaboration", kicker: "PhD · Control, Robotics & AI · The University of Manchester" },
      stats: { papers: "First-author papers", awards: "Awards", honours: "BEng First-Class" },
      about: {
        title: "About Me",
        description: "I'm a PhD researcher in Electrical and Electronic Engineering (Control, Robotics and AI) at The University of Manchester (2024-present), where I also completed my BEng in Electrical and Electronics Engineering with First Class Honors (2021-2024). My work focuses on distributed control, multi-robot coordination, and uncertainty-aware decision-making for autonomous systems. I also serve as a Graduate Teaching Assistant for control and robotics courses, and as the EEE PhD Student Representative (Department Leader, 2024-present).",
        tags: ["Distributed Control", "Multi-Robot Systems", "Consensus & Formation", "Active Source Seeking", "Dual Control"]
      },
      research: {
        title: "Research Interests",
        interests: [
          "Distributed Bayesian active sensing for multi-robot source seeking under communication, safety, and computation constraints.",
          "Dual control for exploration–exploitation (DCEE) with persistence-of-excitation– and Fisher-information–aware information gathering.",
          "Communication-efficient cooperation: event-triggered fusion and source seeking under switching or lossy network topologies.",
          "Learning-augmented, multi-modal autonomous search: RL/world-model planning, joint localization, and LLM-grounded coordination."
        ]
      },
      publications: {
        title: "Publications",
        items: [
          { title: "Dual Control for Multi-Robot Source Seeking with Consensus Mean Fusion and Safety Projection", meta: "First author · 45th Chinese Control Conference (CCC 2026), Changsha", tag: "Accepted" },
          { title: "Trace Weighted Event-Triggered Mean Fusion for Efficient Multi-Robot Source Seeking", meta: "First author · 8th Int. Conf. on Industrial AI (IAI 2026), Shenyang", tag: "Under review" },
          { title: "Multi-Objective Pipeline Scheduling for LLM Inference in Heterogeneous DePIN", meta: "Co-author · IFAC World Congress 2026, Busan", tag: "Accepted" },
          { title: "Load Balancing for LLM Inference Serving: A Control and Learning Oriented Survey", meta: "Co-author · Neurocomputing", tag: "Under review" },
          { title: "Design & Control of Multi-Agent Robotic Systems for Extreme Environments", meta: "Lead author · invited book chapter (in preparation)", tag: "In prep." }
        ]
      },
      education: {
        title: "Education",
        items: [
          { degree: "PhD — Electrical & Electronic Engineering", meta: "Control, Robotics & AI · The University of Manchester · 2024 – present" },
          { degree: "BEng (Hons) — Electrical & Electronic Engineering, First Class", meta: "The University of Manchester · 2021 – 2024" }
        ]
      },
      experience: {
        title: "Experience",
        items: [
          { role: "PhD Researcher — Control, Robotics & AI", org: "The University of Manchester", date: "2024 – present", desc: "Dual control (DCEE) for autonomous source seeking and multi-robot cooperative search." },
          { role: "Graduate Teaching Assistant", org: "The University of Manchester", date: "2024 – present", desc: "Labs, tutorials and assessment across control, robotics and digital-electronics courses." },
          { role: "Guest Lecturer & Experiment Designer", org: "The University of Manchester", date: "2025", desc: "Built an MSc process-control experiment (PLC ↔ MATLAB/Simulink over OPC) and delivered guest lectures." },
          { role: "Academic Tutor", org: "UK study-abroad education consultancy", date: "2026 – present", desc: "Tutor mathematics, physics and academic English; mentor postgraduate research proposals and publication." },
          { role: "PhD Tutor — The Brilliant Club", org: "The Brilliant Club (widening-participation charity)", date: "2026 – present", desc: "Deliver university-style tutorials to school pupils from under-represented backgrounds (Scholars Programme), supporting access to higher education." }
        ]
      },
      skills: {
        title: "Technical Skills",
        groups: [
          { label: "Control & Robotics", tags: ["Dual Control (DCEE)", "Consensus & Formation", "Source Seeking", "Path Planning (A*)", "Multi-Robot Coordination", "ROS"] },
          { label: "Programming", tags: ["Python", "C/C++", "MATLAB", "R", "VHDL"] },
          { label: "Embedded & Hardware", tags: ["STM32", "ESP32", "Arduino", "FPGA", "PCB Design", "PLC"] },
          { label: "Simulation & Tools", tags: ["MATLAB/Simulink", "LabVIEW", "OpenCV", "PLECS", "Git", "LaTeX"] }
        ]
      },
      projects: {
        title: "Projects",
        project1: { title: "Dual Control for Exploration & Exploitation (DCEE) in Autonomous Source Seeking (Sept 2024–present)", desc: "Investigating uncertainty-aware decision-making for autonomous source seeking using DCEE. Designed multi-robot cooperative search algorithms for efficient coordination and target localization. Contributing to a research paper on cooperative DCEE strategies; presented findings at the EEE Postgraduate Research Conference, University of Manchester." },
        project2: { title: "Hack-a-Bot Robotics Challenge (Mar 2025)", desc: "UoM & Sony joint hackathon. Built a full robotics platform in 24 hours: OpenCV vision pipeline (filtering, binarization), A* path planning with dynamic re-routing, ArUco marker localization, and PID trajectory tracking. Achieved a complete autonomous delivery cycle from any start point." },
        project3: { title: "Smart Traffic Cones Swarm Control (Sept 2023–May 2024)", desc: "Designed an ESP32-based robot control board with group robot control and Zigbee communication. Integrated ultrasonic sensors, motor drivers, and developed firmware for ESP32 and STM32." },
        project4: { title: "ESP Buggy — STM32 Autonomous Tracking Car (Sept 2022–May 2023)", desc: "Led design of an STM32-based automatic tracking car as team lead: circuit design, PCB layout, hardware integration, PID-based control, and dual feedback system. Managed project planning and task allocation." },
        project5: { title: "UoM & NVIDIA PuzzleThon — Computer Vision (Mar–Apr 2024)", desc: "Developed computer vision and deep learning functions for an autonomous line-tracking car using Python and ROS. Trained deep learning models to detect and respond to traffic signals from on-board cameras." },
        project6: { title: "Hack-a-Bot Robotics Challenge (Mar 2026)", desc: "Team captain at the UoM & Sony hackathon. Built a dual-robot autonomous system for target localisation, path planning and cooperative object pushing — integrating ArUco localisation, A* planning, and Pure Pursuit + PID control with real-time trajectory correction and synchronised operation. Awarded Third Prize." },
        project7: { title: "OpenClaw × Imperial College London Hackathon (Mar 2026)", desc: "Team captain building a multi-agent AI system in which a coordinator agent delegates product, marketing, sales and operations tasks. Designed inter-agent tool-calling, role specialisation and a shared-state mechanism." }
      },
      awards: {
        title: "Honors & Awards",
        items: [
          { title: "🎓 2026 — Doctoral Training & Development Support Fund (DTDSF)", desc: "The University of Manchester. 2026." },
          { title: "🥉 2026 — Third Prize, Hack-a-Bot Robotics Challenge", desc: "UoM RoboSoc. March 2026." },
          { title: "🥇 2025 — First Place Poster Prize, EEE Postgraduate Research Conference", desc: "Department of Electrical and Electronic Engineering, The University of Manchester. November 2025." },
          { title: "🥇 2025 — First Prize, Hack-a-Bot Robotics Challenge", desc: "The University of Manchester & Sony joint hackathon. March 2025." },
          { title: "🥈 2024 — Second Prize, NVIDIA PuzzleThon", desc: "The University of Manchester & NVIDIA. March 2024." },
          { title: "🥉 2023 — Third Prize, ESP Buggy Development Competition", desc: "The University of Manchester. May 2023." }
        ]
      },
      contact: { title: "Contact", universityEmail: "University Email", personalEmail: "Personal Email", affiliation: "Affiliation", website: "Website", github: "GitHub", linkedin: "LinkedIn" },
      footer: { crafted: "Crafted with a liquid-glass inspired interface." },
      language: { label: "Language" }
    }
  },

  langNames: {
    zh: "中文",
    en: "English",
    de: "Deutsch",
    ru: "Русский",
    fr: "Français",
    'en-US': "English (US)"
  },

  init() {
    // Always default to English on a fresh visit. Language choice persists only
    // within the current browsing session (sessionStorage), and any legacy
    // cross-session preference is cleared so the site opens in English by default.
    try { localStorage.removeItem('site-lang'); } catch (e) {}
    let saved = null;
    try { saved = sessionStorage.getItem('site-lang'); } catch (e) {}
    if (saved && this.translations[saved]) {
      this.currentLang = saved;
    }
    this.apply();
  },

  t() {
    return this.translations[this.currentLang] || this.translations.en;
  },

  setLanguage(lang) {
    if (this.translations[lang]) {
      this.currentLang = lang;
      try { sessionStorage.setItem('site-lang', lang); } catch (e) {}
      this.apply();
    }
  },

  apply() {
    const t = this.t();

    const displayName = t.name || 'Donglin Li (Dennis)';
    const brandEl = document.querySelector('.brand');
    if (brandEl) brandEl.textContent = displayName;
    const sidebarName = document.querySelector('.profile h2');
    if (sidebarName) sidebarName.textContent = displayName;

    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const setNav = (id, txt) => { const a = document.querySelector(`.menu a[href="#${id}"]`); if (a && txt) a.textContent = txt; };
    setNav('about', t.nav.about);
    setNav('research', t.nav.research);
    setNav('publications', t.nav.publications);
    setNav('projects', t.nav.projects);
    setNav('experience', t.nav.experience);
    setNav('awards', t.nav.awards);
    setNav('contact', t.nav.contact);
    const setSecTitle = (id, txt) => { const h = document.querySelector(`#${id} h2`); if (h && txt) h.textContent = txt; };

    const profileSection = document.querySelector('.profile');
    profileSection.querySelector('.small:nth-of-type(1)').textContent = t.profile.title;
    profileSection.querySelector('.small:nth-of-type(2)').textContent = t.profile.rep;
    profileSection.querySelector('.small:nth-of-type(3)').textContent = t.profile.affiliation;
    const quickLinks = profileSection.querySelectorAll('.quick a');
    quickLinks[0].textContent = t.profile.cv;
    quickLinks[1].textContent = t.profile.email;
    quickLinks[2].textContent = t.profile.github;
    quickLinks[3].textContent = t.profile.linkedin;
    quickLinks[4].textContent = t.profile.updates;

    const heroH1 = document.querySelector('#about h1');
    if (heroH1) { heroH1.textContent = t.hero.tagline; heroH1.insertAdjacentHTML('beforeend', '<span class="caret">_</span>'); }
    const heroKicker = document.querySelector('#about .kicker');
    if (heroKicker && t.hero.kicker) heroKicker.textContent = t.hero.kicker;
    document.querySelector('#about .badge').textContent = t.hero.badge;
    const statLabels = document.querySelectorAll('#about .stat .stat-label');
    if (statLabels.length >= 3 && t.stats) {
      statLabels[0].textContent = t.stats.papers;
      statLabels[1].textContent = t.stats.awards;
      statLabels[2].textContent = t.stats.honours;
    }

    const aboutDesc = document.querySelector('#about p');
    aboutDesc.innerHTML = t.about.description;

    const tagRow = document.querySelector('#about .tag-row');
    tagRow.innerHTML = t.about.tags.map(tag => `<span class="tag">${tag}</span>`).join('');

    document.querySelector('#research h2').textContent = t.research.title;
    document.querySelector('#research ul').innerHTML = t.research.interests.map(i => `<li>${i}</li>`).join('');

    setSecTitle('publications', t.publications.title);
    const pubList = document.querySelector('#publications .list');
    if (pubList && Array.isArray(t.publications.items)) {
      pubList.innerHTML = t.publications.items.map((it) => `
        <div class="pub">
          <div class="pub-head"><div class="pub-title">${esc(it.title)}</div>${it.tag ? `<span class="chip">${esc(it.tag)}</span>` : ''}</div>
          <p>${esc(it.meta)}</p>
        </div>`).join('');
    }

    document.querySelector('#projects h2').textContent = t.projects.title;
    const projects = document.querySelectorAll('#projects .pub');
    [1,6,7,2,3,4,5].forEach((n, i) => {
      if (!projects[i]) return;
      projects[i].querySelector('.pub-title').textContent = t.projects[`project${n}`].title;
      projects[i].querySelector('p').textContent = t.projects[`project${n}`].desc;
    });

    if (t.experience) {
      setSecTitle('experience', t.experience.title);
      const expList = document.querySelector('#experience .list');
      if (expList && Array.isArray(t.experience.items)) {
        expList.innerHTML = t.experience.items.map((it) => `
          <div class="pub">
            <div class="pub-head"><div class="pub-title">${esc(it.role)}</div><span class="chip ghost">${esc(it.date)}</span></div>
            <div class="org">${esc(it.org)}</div>
            <p>${esc(it.desc)}</p>
          </div>`).join('');
      }
    }

    if (t.education) {
      setSecTitle('education', t.education.title);
      const eduList = document.querySelector('#education .list');
      if (eduList && Array.isArray(t.education.items)) {
        eduList.innerHTML = t.education.items.map((it) => `
          <div class="pub"><div class="pub-title">${esc(it.degree)}</div><p>${esc(it.meta)}</p></div>`).join('');
      }
    }

    if (t.skills) {
      setSecTitle('skills', t.skills.title);
      const skillWrap = document.querySelector('#skills .groups');
      if (skillWrap && Array.isArray(t.skills.groups)) {
        skillWrap.innerHTML = t.skills.groups.map((g) => `
          <div class="skill-row"><div class="skill-label">${esc(g.label)}</div><div class="tags">${g.tags.map((x) => `<span class="tag">${esc(x)}</span>`).join('')}</div></div>`).join('');
      }
    }

    setSecTitle('awards', t.awards.title);
    const awardList = document.querySelector('#awards .list');
    if (awardList && Array.isArray(t.awards.items)) {
      awardList.innerHTML = t.awards.items.map((it) => `
        <div class="pub"><div class="pub-title">${esc(it.title)}</div><p>${esc(it.desc)}</p></div>`).join('');
    }

    document.querySelector('#contact h2').textContent = t.contact.title;
    document.querySelector('#contact ul').innerHTML = `
      <li>${esc(t.contact.universityEmail)}: <a href="mailto:Donglin.Li@Manchester.ac.uk">Donglin.Li@Manchester.ac.uk</a></li>
      <li>${esc(t.contact.personalEmail)}: <a href="mailto:Dennis.Li201@outlook.com">Dennis.Li201@outlook.com</a></li>
      <li>${esc(t.contact.affiliation)}: Department of Electrical and Electronic Engineering, The University of Manchester</li>
      <li>${esc(t.contact.website)}: <a href="https://Daihaolin201.github.io" target="_blank" rel="noopener">Daihaolin201.github.io</a></li>
      <li>${esc(t.contact.github)}: <a href="https://github.com/Daihaolin201" target="_blank" rel="noopener">github.com/Daihaolin201</a></li>
      <li>${esc(t.contact.linkedin)}: <a href="https://www.linkedin.com/in/donglin-li-55424326b" target="_blank" rel="noopener">linkedin.com/in/donglin-li-55424326b</a></li>
    `;

    const footerEl = document.getElementById('footer-text');
    if (footerEl) footerEl.textContent = new Date().getFullYear() + ' ' + displayName + ' · ' + t.footer.crafted;

    this.updateLangSelector();
  },

  updateLangSelector() {
    const langBtn = document.getElementById('lang-btn');
    if (langBtn) langBtn.textContent = this.langNames[this.currentLang];
  },

  createSelector() {
    const nav = document.querySelector('.menu');

    const langSelector = document.createElement('div');
    langSelector.className = 'lang-selector';
    langSelector.innerHTML = `
      <button id="lang-btn" class="lang-btn" aria-expanded="false" aria-haspopup="listbox">
        ${this.langNames[this.currentLang]}
      </button>
    `;
    nav.appendChild(langSelector);

    const langDropdown = document.createElement('div');
    langDropdown.id = 'lang-dropdown';
    langDropdown.className = 'lang-dropdown';
    langDropdown.setAttribute('role', 'listbox');
    langDropdown.hidden = true;
    langDropdown.style.position = 'fixed';

    langDropdown.innerHTML = Object.entries(this.langNames).map(([code, name]) => `
      <button class="lang-option ${code === this.currentLang ? 'active' : ''}"
              data-lang="${code}"
              role="option"
              aria-selected="${code === this.currentLang}">
        ${name}
      </button>
    `).join('');

    document.body.appendChild(langDropdown);

    const langBtn = document.getElementById('lang-btn');

    const updatePosition = () => {
      if (langDropdown.hidden) return;
      const rect = langBtn.getBoundingClientRect();
      langDropdown.style.top = `${rect.bottom + 4}px`;
      langDropdown.style.left = 'auto';
      langDropdown.style.right = `${window.innerWidth - rect.right}px`;
    };

    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = langBtn.getAttribute('aria-expanded') === 'true';
      if (!isExpanded) {
        langDropdown.hidden = false;
        langBtn.setAttribute('aria-expanded', 'true');
        updatePosition();
      } else {
        langDropdown.hidden = true;
        langBtn.setAttribute('aria-expanded', 'false');
      }
    });

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    document.addEventListener('click', (e) => {
      if (!langDropdown.contains(e.target) && e.target !== langBtn) {
        langBtn.setAttribute('aria-expanded', 'false');
        langDropdown.hidden = true;
      }
    });

    langDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.lang-option');
      if (option) {
        const lang = option.dataset.lang;
        this.setLanguage(lang);
        langDropdown.querySelectorAll('.lang-option').forEach(opt => {
          const isActive = opt.dataset.lang === lang;
          opt.classList.toggle('active', isActive);
          opt.setAttribute('aria-selected', isActive);
        });
        langDropdown.hidden = true;
        langBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }
};
