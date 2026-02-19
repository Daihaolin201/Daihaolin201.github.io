const i18n = {
  currentLang: 'en',

  translations: {
    zh: {
      nav: { about: "关于", research: "研究", projects: "项目", awards: "荣誉", contact: "联系" },
      name: "李栋林 (Dennis Li)",
      profile: {
        title: "博士研究生（2024至今）",
        rep: "EEE博士生代表（2024至今）",
        affiliation: "曼彻斯特大学 电气与电子工程学院",
        cv: "简历", email: "邮箱", github: "代码库", linkedin: "领英", updates: "动态"
      },
      hero: { tagline: "为真实世界系统构建鲁棒的多智能体智能。", badge: "欢迎合作" },
      about: {
        title: "关于我",
        description: "我是曼彻斯特大学电气与电子工程系（控制、机器人与人工智能方向）博士研究生（2024至今），本科亦就读于曼彻斯特大学电气与电子工程专业，以一等荣誉学位毕业（2021—2024年）。研究方向包括分布式控制、多机器人协调以及自主系统的不确定性感知决策。我还担任研究生教学助理，负责控制与机器人相关课程的辅导工作，同时担任EEE博士生代表（部门负责人，2024至今）。",
        tags: ["分布式控制", "多机器人系统", "共识与编队", "主动寻源", "双层控制"]
      },
      research: {
        title: "研究兴趣",
        interests: [
          "自主寻源中探索-利用权衡的双层控制（DCEE）。",
          "多智能体系统的分布式鲁棒共识控制。",
          "感知规划的多机器人协同搜索。",
          "嵌入式平台（STM32、ESP32、PLC）的控制与机器人实验。"
        ]
      },
      publications: {
        title: "研究动态",
        currentStatus: "当前状态",
        currentStatusText: "目前专注于持续项目及手稿准备。正式发表后将在此列出。",
        recentOutputs: "近期成果（2024至今）",
        recentOutputsText: "在曼彻斯特大学RAICO实验室海报展示会上汇报了DCEE算法设计和实验结果，并参与撰写协作DCEE策略相关研究论文。"
      },
      projects: {
        title: "项目",
        project1: { title: "自主寻源中的双层控制（DCEE）研究（2024年9月至今）", desc: "研究自主寻源中的不确定性感知决策，设计多机器人协同搜索算法，实现高效协调与目标定位。参与RAICO实验室海报展示，并参与撰写协作DCEE策略研究论文。" },
        project2: { title: "Hack-a-Bot 机器人挑战赛（2025年3月）", desc: "曼彻斯特大学与索尼联合举办的黑客马拉松。24小时内完成完整机器人平台：图像处理视觉管道（滤波、灰度化、二值化）、带动态重规划的A*路径规划、ArUco标记定位以及基于PID的轨迹跟踪，实现从任意起点出发的完整自主配送循环。" },
        project3: { title: "智能交通锥群体控制（2023年9月—2024年5月）", desc: "设计基于ESP32的机器人控制板，实现群体机器人控制与Zigbee无线通信，集成超声波传感器、电机驱动模块，并分别开发ESP32和STM32固件。" },
        project4: { title: "ESP Buggy — 基于STM32的自动循迹车（2022年9月—2023年5月）", desc: "作为团队负责人主导STM32自动循迹车的设计：涵盖电路设计、PCB布局、硬件集成、基于PID的控制算法以及双反馈系统。负责项目规划、进度安排及任务分配。" },
        project5: { title: "曼彻斯特大学与NVIDIA PuzzleThon — 计算机视觉（2024年3—4月）", desc: "使用Python和ROS为自动循迹车开发计算机视觉与深度学习功能，训练深度学习模型以识别并响应车载摄像头拍摄的交通信号与标志。" }
      },
      awards: {
        title: "荣誉与奖项",
        award1: { title: "🥇 2025 — 海报一等奖，电气与电子工程研究生学术研讨会", desc: "曼彻斯特大学电气与电子工程系，2025年11月。" },
        award2: { title: "🥇 2025 — 一等奖，Hack-a-Bot 机器人挑战赛", desc: "曼彻斯特大学与索尼联合举办的黑客马拉松，2025年3月。" },
        award3: { title: "🥈 2024 — 二等奖，NVIDIA PuzzleThon", desc: "曼彻斯特大学与NVIDIA，2024年3月。" },
        award4: { title: "🥉 2023 — 三等奖，ESP Buggy 开发竞赛", desc: "曼彻斯特大学，2023年5月。" }
      },
      contact: { title: "联系方式", universityEmail: "学校邮箱", personalEmail: "个人邮箱", affiliation: "所属机构", website: "个人网站", github: "代码库", linkedin: "领英" },
      footer: { crafted: "采用流光玻璃界面精心制作。" },
      language: { label: "语言" }
    },

    en: {
      nav: { about: "About", research: "Research", projects: "Projects", awards: "Awards", contact: "Contact" },
      name: "Donglin Li (Dennis)",
      profile: {
        title: "PhD Candidate (2024-present)",
        rep: "EEE PhD Student Rep (2024-present)",
        affiliation: "EEE, The University of Manchester",
        cv: "CV", email: "Email", github: "GitHub", linkedin: "LinkedIn", updates: "Updates"
      },
      hero: { tagline: "Building robust multi-agent intelligence for real-world systems.", badge: "Available for collaboration" },
      about: {
        title: "About Me",
        description: "I am a PhD researcher in Electrical and Electronic Engineering (Control, Robotics and AI) at The University of Manchester (2024-present), where I also completed my BEng in Electrical and Electronics Engineering with First Class Honours (2021-2024). My work focuses on distributed control, multi-robot coordination, and uncertainty-aware decision-making for autonomous systems. I also support teaching in control and robotics related courses as a Graduate Teaching Assistant, and serve as the EEE PhD Student Representative (Department Leader, 2024-present).",
        tags: ["Distributed Control", "Multi-Robot Systems", "Consensus & Formation", "Active Source Seeking", "Dual Control"]
      },
      research: {
        title: "Research Interests",
        interests: [
          "Dual control for exploration-exploitation (DCEE) in autonomous source seeking.",
          "Distributed and robust consensus control for multi-agent systems.",
          "Multi-robot cooperative search with perception-aware planning.",
          "Control and robotics experimentation with embedded platforms (STM32/ESP32/PLC)."
        ]
      },
      publications: {
        title: "Research Updates",
        currentStatus: "Current Status",
        currentStatusText: "I am currently focusing on ongoing projects and manuscript preparation. Formal publications will be listed here once available.",
        recentOutputs: "Recent Outputs (2024–present)",
        recentOutputsText: "Presented DCEE algorithm design and experimental findings at RAICO lab poster sessions at The University of Manchester. Contributing to a research paper on cooperative DCEE strategies."
      },
      projects: {
        title: "Projects",
        project1: { title: "Dual Control for Exploration & Exploitation (DCEE) in Autonomous Source Seeking (Sept 2024–present)", desc: "Investigated uncertainty-aware decision-making for autonomous source seeking using DCEE. Designed multi-robot cooperative search algorithms for efficient coordination and target localisation. Contributed to a research paper on cooperative DCEE strategies; presented findings at RAICO lab poster sessions." },
        project2: { title: "Hack-a-Bot Robotics Challenge (Mar 2025)", desc: "UoM & Sony joint hackathon. Built a full robotics platform in 24 hours: OpenCV vision pipeline (filtering, binarisation), A* path planning with dynamic re-routing, ArUco marker localisation, and PID trajectory tracking. Achieved a complete autonomous delivery cycle from any start point." },
        project3: { title: "Smart Traffic Cones Swarm Control (Sept 2023–May 2024)", desc: "Designed an ESP32-based robot control board with group robot control and Zigbee communication. Integrated ultrasonic sensors, motor drivers, and developed firmware for ESP32 and STM32." },
        project4: { title: "ESP Buggy — STM32 Autonomous Tracking Car (Sept 2022–May 2023)", desc: "Led design of an STM32-based automatic tracking car as team lead: circuit design, PCB layout, hardware integration, PID-based control, and dual feedback system. Managed project planning and task allocation." },
        project5: { title: "UoM & NVIDIA PuzzleThon — Computer Vision (Mar–Apr 2024)", desc: "Developed computer vision and deep learning functions for an autonomous line-tracking car using Python and ROS. Trained deep learning models to detect and respond to traffic signals from on-board cameras." }
      },
      awards: {
        title: "Honours & Awards",
        award1: { title: "🥇 2025 — First Place Poster Prize, EEE Postgraduate Research Conference", desc: "Department of Electrical and Electronic Engineering, The University of Manchester. November 2025." },
        award2: { title: "🥇 2025 — First Prize, Hack-a-Bot Robotics Challenge", desc: "The University of Manchester & Sony joint hackathon. March 2025." },
        award3: { title: "🥈 2024 — Second Prize, NVIDIA PuzzleThon", desc: "The University of Manchester & NVIDIA. March 2024." },
        award4: { title: "🥉 2023 — Third Prize, ESP Buggy Development Competition", desc: "The University of Manchester. May 2023." }
      },
      contact: { title: "Contact", universityEmail: "University Email", personalEmail: "Personal Email", affiliation: "Affiliation", website: "Website", github: "GitHub", linkedin: "LinkedIn" },
      footer: { crafted: "Crafted with a liquid-glass inspired interface." },
      language: { label: "Language" }
    },

    de: {
      nav: { about: "Über mich", research: "Forschung", projects: "Projekte", awards: "Auszeichnungen", contact: "Kontakt" },
      name: "Donglin Li (Dennis)",
      profile: {
        title: "Doktorand (2024–heute)",
        rep: "EEE Doktorandenvertreter (2024–heute)",
        affiliation: "Elektrotechnik, Universität Manchester",
        cv: "Lebenslauf", email: "E-Mail", github: "GitHub", linkedin: "LinkedIn", updates: "Neuigkeiten"
      },
      hero: { tagline: "Robuste Multi-Agenten-Intelligenz für reale Systeme entwickeln.", badge: "Offen für Kooperationen" },
      about: {
        title: "Über mich",
        description: "Ich bin Doktorand im Bereich Elektro- und Elektronikingenieurwesen (Regelungstechnik, Robotik und KI) an der Universität Manchester (2024–heute), wo ich zuvor meinen BEng in Elektro- und Elektronikingenieurwesen mit Auszeichnung (First Class Honours) abgeschlossen habe (2021–2024). Meine Forschung konzentriert sich auf verteilte Regelung, Koordination mehrerer Roboter und unsicherheitsbewusste Entscheidungsfindung für autonome Systeme. Außerdem bin ich als wissenschaftlicher Lehrbeauftragter für Lehrveranstaltungen zu Regelungstechnik und Robotik tätig und fungiere als Doktorandenvertreter des Fachbereichs EEE (Abteilungsleiter, 2024–heute).",
        tags: ["Verteilte Regelung", "Mehrrobotersysteme", "Konsens & Formation", "Aktive Quellsuche", "Duale Regelung"]
      },
      research: {
        title: "Forschungsinteressen",
        interests: [
          "Duale Regelung für Exploration und Exploitation (DCEE) bei der autonomen Quellsuche.",
          "Verteilte und robuste Konsensregelung für Mehragentensysteme.",
          "Kooperative Mehrrobotersuche mit wahrnehmungsbasierter Planung.",
          "Regelungs- und Robotikexperimente auf eingebetteten Plattformen (STM32/ESP32/SPS)."
        ]
      },
      publications: {
        title: "Forschungsneuigkeiten",
        currentStatus: "Aktueller Stand",
        currentStatusText: "Derzeit konzentriere ich mich auf laufende Projekte und die Vorbereitung von Manuskripten. Formale Publikationen werden hier aufgeführt, sobald sie verfügbar sind.",
        recentOutputs: "Aktuelle Ergebnisse (2024–heute)",
        recentOutputsText: "Präsentation des DCEE-Algorithmusentwurfs und experimenteller Ergebnisse bei Postersitzungen des RAICO-Labors an der Universität Manchester. Mitarbeit an einem Forschungsartikel über kooperative DCEE-Strategien."
      },
      projects: {
        title: "Projekte",
        project1: { title: "Duale Regelung für Exploration & Exploitation (DCEE) bei der autonomen Quellsuche (Sep. 2024–heute)", desc: "Untersuchung unsicherheitsbewusster Entscheidungsfindung bei der autonomen Quellsuche mittels DCEE. Entwurf kooperativer Mehrroboter-Suchalgorithmen für effiziente Koordination und Ziellokalisierung. Mitarbeit an einem Forschungsartikel über kooperative DCEE-Strategien; Präsentation der Ergebnisse bei Postersitzungen des RAICO-Labors." },
        project2: { title: "Hack-a-Bot Robotik-Wettbewerb (März 2025)", desc: "Gemeinsamer Hackathon der Universität Manchester und Sony. Vollständige Roboterplattform in 24 Stunden entwickelt: Bildverarbeitungs-Pipeline (Filterung, Binärisierung), A*-Pfadplanung mit dynamischer Neuplanung, ArUco-Markerlokalisierung und PID-basierte Trajektorienverfolgung. Vollständiger autonomer Lieferzyklus von beliebigem Startpunkt realisiert." },
        project3: { title: "Schwarmsteuerung intelligenter Verkehrskegel (Sep. 2023–Mai 2024)", desc: "Entwurf einer ESP32-basierten Robotersteuerplatine mit Gruppenrobotersteuerung und Zigbee-Kommunikation. Integration von Ultraschallsensoren, Motortreibern sowie Entwicklung von Firmware für ESP32 und STM32." },
        project4: { title: "ESP Buggy — Autonomes Spurverfolgungsfahrzeug auf STM32-Basis (Sep. 2022–Mai 2023)", desc: "Als Teamleiter die Entwicklung eines STM32-basierten automatischen Spurverfolgungsfahrzeugs geleitet: Schaltkreisdesign, Leiterplattenentwicklung, Hardwareintegration, PID-basierte Regelung und duales Rückkopplungssystem. Verantwortlich für Projektplanung, Zeitplanung und Aufgabenverteilung." },
        project5: { title: "Universität Manchester & NVIDIA PuzzleThon — Computer Vision (März–Apr. 2024)", desc: "Entwicklung von Bildverarbeitungs- und Deep-Learning-Funktionen für ein autonomes Spurverfolgungsfahrzeug mit Python und ROS. Training von Deep-Learning-Modellen zur Erkennung und Reaktion auf Verkehrssignale aus bordeigenen Kameras." }
      },
      awards: {
        title: "Auszeichnungen & Preise",
        award1: { title: "🥇 2025 — Erster Platz (Posterpreis), Doktorandenkonferenz der Elektrotechnik", desc: "Fachbereich Elektro- und Elektronikingenieurwesen, Universität Manchester. November 2025." },
        award2: { title: "🥇 2025 — Erster Preis, Hack-a-Bot Robotik-Wettbewerb", desc: "Gemeinsamer Hackathon der Universität Manchester und Sony. März 2025." },
        award3: { title: "🥈 2024 — Zweiter Preis, NVIDIA PuzzleThon", desc: "Universität Manchester & NVIDIA. März 2024." },
        award4: { title: "🥉 2023 — Dritter Preis, ESP Buggy-Entwicklungswettbewerb", desc: "Universität Manchester. Mai 2023." }
      },
      contact: { title: "Kontakt", universityEmail: "Uni-E-Mail", personalEmail: "Private E-Mail", affiliation: "Institution", website: "Webseite", github: "GitHub", linkedin: "LinkedIn" },
      footer: { crafted: "Gestaltet mit einer Flüssigglas-inspirierten Oberfläche." },
      language: { label: "Sprache" }
    },

    ru: {
      nav: { about: "О себе", research: "Исследования", projects: "Проекты", awards: "Награды", contact: "Контакты" },
      name: "Donglin Li (Dennis)",
      profile: {
        title: "Аспирант (2024–н.в.)",
        rep: "Представитель аспирантов EEE (2024–н.в.)",
        affiliation: "Электротехнический факультет, Манчестерский университет",
        cv: "Резюме", email: "Эл. почта", github: "GitHub", linkedin: "LinkedIn", updates: "Обновления"
      },
      hero: { tagline: "Создание устойчивого мультиагентного интеллекта для реальных систем.", badge: "Открыт к сотрудничеству" },
      about: {
        title: "Обо мне",
        description: "Я аспирант факультета электротехники и электроники (управление, робототехника и ИИ) Манчестерского университета (2024–н.в.), где ранее получил степень бакалавра электротехники с отличием (First Class Honours, 2021–2024). Мои исследования посвящены распределённому управлению, координации нескольких роботов и принятию решений в условиях неопределённости для автономных систем. Также работаю ассистентом преподавателя на курсах по теории управления и робототехнике и являюсь представителем аспирантов факультета EEE (руководитель направления, 2024–н.в.).",
        tags: ["Распределённое управление", "Многороботные системы", "Консенсус и строй", "Активный поиск источника", "Двойное управление"]
      },
      research: {
        title: "Научные интересы",
        interests: [
          "Двойное управление (DCEE) для исследования и эксплуатации при автономном поиске источника.",
          "Распределённое и робастное управление консенсусом для многоагентных систем.",
          "Кооперативный поиск несколькими роботами с учётом перцептивного планирования.",
          "Эксперименты в области управления и робототехники на встраиваемых платформах (STM32/ESP32/ПЛК)."
        ]
      },
      publications: {
        title: "Научные новости",
        currentStatus: "Текущий статус",
        currentStatusText: "В настоящее время сосредоточен на текущих проектах и подготовке рукописей. Публикации будут указаны здесь после выхода.",
        recentOutputs: "Последние результаты (2024–н.в.)",
        recentOutputsText: "Представил конструкцию алгоритма DCEE и экспериментальные результаты на постерных сессиях лаборатории RAICO Манчестерского университета. Участвую в написании исследовательской статьи о кооперативных стратегиях DCEE."
      },
      projects: {
        title: "Проекты",
        project1: { title: "Двойное управление для исследования и эксплуатации (DCEE) при автономном поиске источника (сент. 2024–н.в.)", desc: "Исследование принятия решений в условиях неопределённости при автономном поиске источника с использованием DCEE. Разработка алгоритмов кооперативного поиска несколькими роботами для эффективной координации и обнаружения цели. Участие в написании статьи о стратегиях кооперативного DCEE; представление результатов на постерных сессиях лаборатории RAICO." },
        project2: { title: "Робототехнический конкурс Hack-a-Bot (март 2025)", desc: "Совместный хакатон Манчестерского университета и Sony. За 24 часа создана полноценная роботизированная платформа: конвейер компьютерного зрения (фильтрация, бинаризация), планирование пути А* с динамической перестройкой, локализация по маркерам ArUco и ПИД-управление траекторией. Реализован полный автономный цикл доставки из любой начальной точки." },
        project3: { title: "Роевое управление умными дорожными конусами (сент. 2023–май 2024)", desc: "Разработана управляющая плата на основе ESP32 с групповым управлением роботами и беспроводной связью Zigbee. Интегрированы ультразвуковые датчики, драйверы двигателей, разработана прошивка для ESP32 и STM32." },
        project4: { title: "ESP Buggy — автоматический трекер на базе STM32 (сент. 2022–май 2023)", desc: "В роли руководителя команды разработал автоматический трекер на STM32: схемотехника, проектирование печатной платы, интеграция аппаратуры, ПИД-управление и двойная система обратной связи. Отвечал за планирование проекта, составление графика и распределение задач." },
        project5: { title: "Манчестерский университет & NVIDIA PuzzleThon — компьютерное зрение (март–апр. 2024)", desc: "Разработал функции компьютерного зрения и глубокого обучения для автономного трекера с использованием Python и ROS. Обучил модели глубокого обучения для распознавания дорожных знаков и сигналов с бортовых камер." }
      },
      awards: {
        title: "Достижения и награды",
        award1: { title: "🥇 2025 — Первое место (постер), конференция аспирантов электротехнического факультета", desc: "Факультет электротехники и электроники, Манчестерский университет. Ноябрь 2025." },
        award2: { title: "🥇 2025 — Первое место, робототехнический конкурс Hack-a-Bot", desc: "Совместный хакатон Манчестерского университета и Sony. Март 2025." },
        award3: { title: "🥈 2024 — Второе место, NVIDIA PuzzleThon", desc: "Манчестерский университет и NVIDIA. Март 2024." },
        award4: { title: "🥉 2023 — Третье место, конкурс разработки ESP Buggy", desc: "Манчестерский университет. Май 2023." }
      },
      contact: { title: "Контакты", universityEmail: "Университетская почта", personalEmail: "Личная почта", affiliation: "Место работы", website: "Сайт", github: "GitHub", linkedin: "LinkedIn" },
      footer: { crafted: "Создано с интерфейсом в стиле жидкого стекла." },
      language: { label: "Язык" }
    },

    fr: {
      nav: { about: "À propos", research: "Recherche", projects: "Projets", awards: "Prix", contact: "Contact" },
      name: "Donglin Li (Dennis)",
      profile: {
        title: "Doctorant (2024–présent)",
        rep: "Représentant des doctorants EEE (2024–présent)",
        affiliation: "Génie électrique, Université de Manchester",
        cv: "CV", email: "E-mail", github: "GitHub", linkedin: "LinkedIn", updates: "Actualités"
      },
      hero: { tagline: "Développer une intelligence multi-agents robuste pour les systèmes réels.", badge: "Disponible pour collaborations" },
      about: {
        title: "À propos de moi",
        description: "Je suis doctorant en génie électrique et électronique (contrôle, robotique et IA) à l'Université de Manchester (2024–présent), où j'ai également obtenu mon BEng en génie électrique et électronique avec mention très bien (First Class Honours, 2021–2024). Mes travaux portent sur le contrôle distribué, la coordination multi-robots et la prise de décision en conditions d'incertitude pour les systèmes autonomes. Je suis également chargé d'enseignement pour les cours de contrôle et de robotique, et assure la représentation des doctorants du département EEE (chef de département, 2024–présent).",
        tags: ["Contrôle distribué", "Systèmes multi-robots", "Consensus et formation", "Recherche de source active", "Contrôle dual"]
      },
      research: {
        title: "Intérêts de recherche",
        interests: [
          "Contrôle dual (DCEE) pour l'exploration-exploitation dans la recherche autonome de source.",
          "Contrôle consensus distribué et robuste pour les systèmes multi-agents.",
          "Recherche coopérative multi-robots avec planification perceptive.",
          "Expérimentation en contrôle et robotique sur plateformes embarquées (STM32/ESP32/automate programmable)."
        ]
      },
      publications: {
        title: "Actualités de recherche",
        currentStatus: "Statut actuel",
        currentStatusText: "Je me concentre actuellement sur les projets en cours et la préparation de manuscrits. Les publications seront listées ici une fois disponibles.",
        recentOutputs: "Résultats récents (2024–présent)",
        recentOutputsText: "Présentation des algorithmes DCEE et des résultats expérimentaux lors des sessions poster du laboratoire RAICO à l'Université de Manchester. Contribution à un article de recherche sur les stratégies DCEE coopératives."
      },
      projects: {
        title: "Projets",
        project1: { title: "Contrôle dual pour l'exploration et l'exploitation (DCEE) dans la recherche autonome de source (sept. 2024–présent)", desc: "Recherche sur la prise de décision en conditions d'incertitude pour la recherche autonome de source à l'aide du DCEE. Conception d'algorithmes de recherche coopérative multi-robots pour une coordination efficace et une localisation de cible. Contribution à un article sur les stratégies DCEE coopératives ; présentation des résultats lors des sessions poster du laboratoire RAICO." },
        project2: { title: "Concours de robotique Hack-a-Bot (mars 2025)", desc: "Hackathon conjoint Université de Manchester & Sony. Plateforme robotique complète développée en 24 heures : pipeline de traitement d'image (filtrage, binarisation), planification de chemin A* avec recalcul dynamique, localisation par marqueurs ArUco et suivi de trajectoire PID. Cycle de livraison autonome complet réalisé depuis n'importe quel point de départ." },
        project3: { title: "Contrôle en essaim de cônes de signalisation intelligents (sept. 2023–mai 2024)", desc: "Conception d'une carte de contrôle robotique à base d'ESP32 avec gestion de groupe et communication Zigbee. Intégration de capteurs à ultrasons, de pilotes de moteurs et développement de micrologiciels pour ESP32 et STM32." },
        project4: { title: "ESP Buggy — Véhicule autonome de suivi de trajectoire sur STM32 (sept. 2022–mai 2023)", desc: "Direction de la conception d'un véhicule de suivi automatique à base de STM32 en tant que chef d'équipe : schéma électronique, conception de circuit imprimé, intégration matérielle, contrôle PID et double système de rétroaction. Gestion de la planification du projet, du calendrier et de la répartition des tâches." },
        project5: { title: "Université de Manchester & NVIDIA PuzzleThon — vision par ordinateur (mars–avr. 2024)", desc: "Développement de fonctions de vision par ordinateur et d'apprentissage profond pour un véhicule de suivi autonome en Python et ROS. Entraînement de modèles d'apprentissage profond pour la détection des signaux de circulation à partir des caméras embarquées." }
      },
      awards: {
        title: "Distinctions & Prix",
        award1: { title: "🥇 2025 — Premier Prix Poster, Conférence de recherche des doctorants en génie électrique", desc: "Département de génie électrique et électronique, Université de Manchester. Novembre 2025." },
        award2: { title: "🥇 2025 — Premier Prix, Concours de robotique Hack-a-Bot", desc: "Hackathon conjoint Université de Manchester & Sony. Mars 2025." },
        award3: { title: "🥈 2024 — Deuxième Prix, NVIDIA PuzzleThon", desc: "Université de Manchester & NVIDIA. Mars 2024." },
        award4: { title: "🥉 2023 — Troisième Prix, Concours de développement ESP Buggy", desc: "Université de Manchester. Mai 2023." }
      },
      contact: { title: "Contact", universityEmail: "E-mail universitaire", personalEmail: "E-mail personnel", affiliation: "Établissement", website: "Site web", github: "GitHub", linkedin: "LinkedIn" },
      footer: { crafted: "Conçu avec une interface inspirée du verre liquide." },
      language: { label: "Langue" }
    },

    'en-US': {
      nav: { about: "About", research: "Research", projects: "Projects", awards: "Awards", contact: "Contact" },
      name: "Donglin Li (Dennis)",
      profile: {
        title: "PhD Candidate (2024-present)",
        rep: "EEE PhD Student Rep (2024-present)",
        affiliation: "EEE, The University of Manchester",
        cv: "CV", email: "Email", github: "GitHub", linkedin: "LinkedIn", updates: "Updates"
      },
      hero: { tagline: "Building robust multi-agent intelligence for real-world systems.", badge: "Open to collaboration" },
      about: {
        title: "About Me",
        description: "I'm a PhD researcher in Electrical and Electronic Engineering (Control, Robotics and AI) at The University of Manchester (2024-present), where I also completed my BEng in Electrical and Electronics Engineering with First Class Honors (2021-2024). My work focuses on distributed control, multi-robot coordination, and uncertainty-aware decision-making for autonomous systems. I also serve as a Graduate Teaching Assistant for control and robotics courses, and as the EEE PhD Student Representative (Department Leader, 2024-present).",
        tags: ["Distributed Control", "Multi-Robot Systems", "Consensus & Formation", "Active Source Seeking", "Dual Control"]
      },
      research: {
        title: "Research Interests",
        interests: [
          "Dual control for exploration-exploitation (DCEE) in autonomous source seeking.",
          "Distributed and robust consensus control for multi-agent systems.",
          "Multi-robot cooperative search with perception-aware planning.",
          "Control and robotics experimentation with embedded platforms (STM32/ESP32/PLC)."
        ]
      },
      publications: {
        title: "Research Updates",
        currentStatus: "Current Status",
        currentStatusText: "I'm currently focused on ongoing projects and manuscript preparation. Formal publications will be listed here once available.",
        recentOutputs: "Recent Outputs (2024–present)",
        recentOutputsText: "Presented DCEE algorithm design and experimental findings at RAICO lab poster sessions at The University of Manchester. Contributing to a research paper on cooperative DCEE strategies."
      },
      projects: {
        title: "Projects",
        project1: { title: "Dual Control for Exploration & Exploitation (DCEE) in Autonomous Source Seeking (Sept 2024–present)", desc: "Investigating uncertainty-aware decision-making for autonomous source seeking using DCEE. Designed multi-robot cooperative search algorithms for efficient coordination and target localization. Contributing to a research paper on cooperative DCEE strategies; presented findings at RAICO lab poster sessions." },
        project2: { title: "Hack-a-Bot Robotics Challenge (Mar 2025)", desc: "UoM & Sony joint hackathon. Built a full robotics platform in 24 hours: OpenCV vision pipeline (filtering, binarization), A* path planning with dynamic re-routing, ArUco marker localization, and PID trajectory tracking. Achieved a complete autonomous delivery cycle from any start point." },
        project3: { title: "Smart Traffic Cones Swarm Control (Sept 2023–May 2024)", desc: "Designed an ESP32-based robot control board with group robot control and Zigbee communication. Integrated ultrasonic sensors, motor drivers, and developed firmware for ESP32 and STM32." },
        project4: { title: "ESP Buggy — STM32 Autonomous Tracking Car (Sept 2022–May 2023)", desc: "Led design of an STM32-based automatic tracking car as team lead: circuit design, PCB layout, hardware integration, PID-based control, and dual feedback system. Managed project planning and task allocation." },
        project5: { title: "UoM & NVIDIA PuzzleThon — Computer Vision (Mar–Apr 2024)", desc: "Developed computer vision and deep learning functions for an autonomous line-tracking car using Python and ROS. Trained deep learning models to detect and respond to traffic signals from on-board cameras." }
      },
      awards: {
        title: "Honors & Awards",
        award1: { title: "🥇 2025 — First Place Poster Prize, EEE Postgraduate Research Conference", desc: "Department of Electrical and Electronic Engineering, The University of Manchester. November 2025." },
        award2: { title: "🥇 2025 — First Prize, Hack-a-Bot Robotics Challenge", desc: "The University of Manchester & Sony joint hackathon. March 2025." },
        award3: { title: "🥈 2024 — Second Prize, NVIDIA PuzzleThon", desc: "The University of Manchester & NVIDIA. March 2024." },
        award4: { title: "🥉 2023 — Third Prize, ESP Buggy Development Competition", desc: "The University of Manchester. May 2023." }
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
    const saved = localStorage.getItem('site-lang');
    if (saved && this.translations[saved]) {
      this.currentLang = saved;
    } else {
      const browserLang = navigator.language;
      if (browserLang.startsWith('zh')) this.currentLang = 'zh';
      else if (browserLang.startsWith('de')) this.currentLang = 'de';
      else if (browserLang.startsWith('ru')) this.currentLang = 'ru';
      else if (browserLang.startsWith('fr')) this.currentLang = 'fr';
    }
    this.apply();
  },

  t() {
    return this.translations[this.currentLang] || this.translations.en;
  },

  setLanguage(lang) {
    if (this.translations[lang]) {
      this.currentLang = lang;
      localStorage.setItem('site-lang', lang);
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

    document.querySelector('.menu a[href="#about"]').textContent = t.nav.about;
    document.querySelector('.menu a[href="#research"]').textContent = t.nav.research;
    document.querySelector('.menu a[href="#projects"]').textContent = t.nav.projects;
    document.querySelector('.menu a[href="#awards"]').textContent = t.nav.awards;
    document.querySelector('.menu a[href="#contact"]').textContent = t.nav.contact;

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

    document.querySelector('#about h1').textContent = t.hero.tagline;
    document.querySelector('#about .badge').textContent = t.hero.badge;

    const aboutDesc = document.querySelector('#about p');
    aboutDesc.innerHTML = t.about.description;

    const tagRow = document.querySelector('#about .tag-row');
    tagRow.innerHTML = t.about.tags.map(tag => `<span class="tag">${tag}</span>`).join('');

    document.querySelector('#research h2').textContent = t.research.title;
    document.querySelector('#research ul').innerHTML = t.research.interests.map(i => `<li>${i}</li>`).join('');

    document.querySelector('#publications h2').textContent = t.publications.title;
    const pubs = document.querySelectorAll('#publications .pub');
    pubs[0].querySelector('.pub-title').textContent = t.publications.currentStatus;
    pubs[0].querySelector('p').textContent = t.publications.currentStatusText;
    pubs[1].querySelector('.pub-title').textContent = t.publications.recentOutputs;
    pubs[1].querySelector('p').textContent = t.publications.recentOutputsText;

    document.querySelector('#projects h2').textContent = t.projects.title;
    const projects = document.querySelectorAll('#projects .pub');
    [1,2,3,4,5].forEach((n, i) => {
      projects[i].querySelector('.pub-title').textContent = t.projects[`project${n}`].title;
      projects[i].querySelector('p').textContent = t.projects[`project${n}`].desc;
    });

    document.querySelector('#awards h2').textContent = t.awards.title;
    const awards = document.querySelectorAll('#awards .pub');
    [1,2,3,4].forEach((n, i) => {
      awards[i].querySelector('.pub-title').textContent = t.awards[`award${n}`].title;
      awards[i].querySelector('p').textContent = t.awards[`award${n}`].desc;
    });

    document.querySelector('#contact h2').textContent = t.contact.title;
    document.querySelector('#contact ul').innerHTML = `
      <li>${t.contact.universityEmail}: <a href="mailto:Donglin.Li@Manchester.ac.uk">Donglin.Li@Manchester.ac.uk</a></li>
      <li>${t.contact.personalEmail}: <a href="mailto:Dennis.Li201@outlook.com">Dennis.Li201@outlook.com</a></li>
      <li>${t.contact.affiliation}: Department of Electrical and Electronic Engineering, The University of Manchester</li>
      <li>${t.contact.website}: <a href="https://Daihaolin201.github.io" target="_blank" rel="noopener">Daihaolin201.github.io</a></li>
      <li>${t.contact.github}: <a href="https://github.com/Daihaolin201" target="_blank" rel="noopener">github.com/Daihaolin201</a></li>
      <li>${t.contact.linkedin}: <a href="https://www.linkedin.com/in/donglin-li-55424326b" target="_blank" rel="noopener">linkedin.com/in/donglin-li-55424326b</a></li>
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
