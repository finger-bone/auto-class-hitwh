import axios, { AxiosInstance } from "axios";
import {
  getQRCode,
  getQRCodeStatus,
  webvpnLogin,
} from "./agent/webvpnLogin.ts";
import { configureHeaders } from "./agent/configure.ts";
import { fetchCourses } from "./agent/adminFetcher.ts";
import { adminLogin } from "./agent/adminLogin.ts";
import { parseCourses } from "./parser/courseParser.ts";
import { submitRequest } from "./agent/submit.ts";
import prompts from "prompts";
import chalk from "chalk";
import ora from "ora";
import Table from "cli-table3";
import fs from "node:fs";
import type { Course } from "./parser/courseParser.ts";
import type { CourseType } from "./agent/adminFetcher.ts";
import type { Semester } from "./agent/adminFetcher.ts";
import process, { title } from "node:process";
import path from "node:path";
import { Buffer } from "node:buffer";

const QRCODE_FILE = "login_qrcode.png";
const COOKIE_FILE = "cookie.txt";

// 类型中文映射
const COURSE_TYPE_MAP: Record<string, string> = {
  yy: "外语",
  ty: "体育",
  szhx: "素质核心",
  cxyx: "创新研修",
  cxsy: "创新实验",
  xsyt: "新生研讨",
  tsk: "未来技术",
  xsxk: "外专业课程",
};

// 改进的筛选逻辑
async function filterCourses(courses: Course[]) {
  const { filterType } = await prompts({
    type: "select",
    name: "filterType",
    message: "请选择筛选方式",
    choices: [
      { title: "不筛选", value: "none" },
      { title: "按关键词搜索", value: "keyword" },
    ],
    instructions: false,
  });

  if (filterType === "none") {
    return courses;
  }

  const { keyword } = await prompts({
    type: "text",
    name: "keyword",
    message:
      "请输入搜索关键词（课程名/代码/详细信息内），多个词之间用空格分隔：\n" +
      "例如，'数学 信息学'\n即搜索有 '数学' 或 '信息学' 的课程",
  });
  const splittedKeywords = (keyword as string).split(" ");
  return courses.filter((c) =>
    [c.name, c.code, c.info].some((field) =>
      splittedKeywords.some((kw) =>
        field?.toLowerCase().includes(kw.toLowerCase())
      )
    )
  );
}

// 增强的课程选择逻辑
async function selectCourses(courses: Course[]) {
  const choices = courses.map((course) => ({
    title: `${course.code} - ${course.name}`,
    value: course.code,
    description: [
      `类型: ${COURSE_TYPE_MAP[course.type]}`,
      `详细信息: ${course.info.slice(0, 100)}`,
      `学分: ${course.credit}`,
      `容量: ${course.capacity.padStart(3)}/${course.requirement}`,
    ].join("\n\n"),
  }));

  const { selected } = await prompts({
    type: "multiselect",
    name: "selected",
    message: "请选择课程",
    choices,
    hint: "↑↓: 浏览 | 空格: 选择 | Enter: 确认",
    instructions: false,
  });

  return selected.map((code: string) => courses.find((c) => c.code === code));
}

// 二维码登录流程
const handleQRLogin = async (): Promise<
  { session: AxiosInstance; cookies: string }
> => {
  const session = axios.create({ withCredentials: true });
  configureHeaders(session);

  // 获取二维码图片数据
  const { uuid, qrCodeUrl } = await getQRCode(session);

  // 创建临时文件路径
  const qrCodePath = path.join(process.cwd(), QRCODE_FILE);

  // 下载并保存二维码图片
  const response = await axios.get(qrCodeUrl, { responseType: "arraybuffer" });
  fs.writeFileSync(qrCodePath, Buffer.from(response.data, "binary"));

  console.log(chalk.yellow(`\n二维码已保存至：${chalk.underline(qrCodePath)}`));

  console.log(chalk.cyan("请打开上述图片，使用 HIT APP 扫描二维码后继续"));

  const spinner = ora("等待扫码确认").start();
  let loggedIn = false;

  while (!loggedIn) {
    const status = await getQRCodeStatus(session, uuid);
    if (status === "confirmed") {
      loggedIn = true;
      spinner.succeed("登录成功");
    } else if (status === "scanned") {
      spinner.text = "二维码已扫描";
    } else if (status === "expired") {
      spinner.fail("二维码已过期");
      process.exit(1);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const cookies = await webvpnLogin(session, uuid);
  await adminLogin(session, cookies);
  fs.writeFileSync(COOKIE_FILE, cookies);
  console.log(
    chalk.green("\n当前Cookies已经写入："),
    chalk.underline("cookies.txt"),
  );
  console.log(
    chalk.green(
      "\n如果短期内需要再次登录，可直接使用上述Cookies，无需再次扫描二维码",
    ),
  );
  return { session, cookies };
};

// 主流程
const main = async () => {
  try {
    const tip_text = chalk`
┌────────────────── 操作说明 ──────────────────┐
│                                              │
│  ▸ 单选模式                                  │
│    ↑/↓ : 切换选项                            │
│    Enter : 确认选择                          │
│                                              │
│  ▸ 多选模式                                  │
│    ↑/↓ : 切换选项                            │
│    空格 : 选中/取消                          │
│    Enter : 完成选择                          │
│                                              │
│  ▸ 输入模式                                  │
│    Enter : 确认输入                          │
│                                              │
└──────────────────────────────────────────────┘
`;

    console.log(tip_text);
    // 登录方式选择
    const { loginType } = await prompts({
      type: "select",
      name: "loginType",
      message: "选择登录方式",
      choices: [
        { title: "扫码登录", value: "qr" },
        { title: "手动输入Cookie", value: "manual" },
        { title: "使用上次保存的Cookie (仅若干小时以内有效)", value: "last" },
      ],
      instructions: false,
    });

    let session: AxiosInstance;
    let cookies: string;

    if (loginType === "qr") {
      const loginResult = await handleQRLogin();
      session = loginResult.session;
      cookies = loginResult.cookies;
    } else if (loginType === "manual") {
      const response = await prompts({
        type: "text",
        name: "cookie",
        message: "请输入Cookie内容：",
      });
      cookies = response.cookie;
      session = axios.create({ withCredentials: true });
      configureHeaders(session);
    } else {
      cookies = fs.readFileSync(COOKIE_FILE, "utf-8");
      session = axios.create({ withCredentials: true });
      configureHeaders(session);
    }

    console.log(chalk.green("\n当前Cookies："), cookies);

    // 学期选择
    const semesterResponse = await prompts([
      {
        type: "number",
        name: "yearStart",
        message: "请输入当前年份",
        validate: (value: number) =>
          (value > 2000 && value < 2100) ? true : "无效的年份",
      },
      {
        type: "select",
        name: "semesterOrder",
        message: "选择学期",
        choices: [
          { title: "秋季学期", value: 1 },
          { title: "春季学期", value: 2 },
          { title: "夏季学期", value: 3 },
        ],
        instructions: false,
      },
    ]) as Semester;
    if (semesterResponse.semesterOrder !== 1) {
      semesterResponse.yearStart -= 1;
    }

    // 课程类型选择
    const { courseTypes } = await prompts({
      type: "multiselect",
      name: "courseTypes",
      message: "选择课程类型",
      choices: [
        { title: "外语", value: "yy" },
        { title: "体育", value: "ty" },
        { title: "素质核心", value: "szhx" },
        { title: "创新研修", value: "cxyx" },
        { title: "创新实验", value: "cxsy" },
        { title: "新生研讨", value: "xsyt" },
        { title: "未来技术", value: "tsk" },
        { title: "外专业课程", value: "xsxk" },
      ],
      hints: "↑↓: 浏览 | 空格: 选择 | Enter: 确认",
      min: 1,
      instructions: false,
    }) as { courseTypes: CourseType[] };

    // 获取课程数据
    const spinner = ora("正在解析课程数据...").start();
    const coursesHtmls = await fetchCourses(
      session,
      cookies,
      courseTypes,
      semesterResponse,
    );
    const parsedCoursesByType = parseCourses(coursesHtmls);

    let allCourses: Course[] = [];
    for (const [type, courses] of Object.entries(parsedCoursesByType)) {
      allCourses = allCourses.concat(
        courses.map((c) => ({ ...c, type: type as CourseType })),
      );
    }
    spinner.succeed(`解析完成，共 ${allCourses.length} 门课程`);

    // 新增筛选流程
    const filtered = await filterCourses(allCourses);
    // displayCourses(filtered);

    // 增强的选择流程
    const selected = await selectCourses(filtered);
    if (!selected.length) {
      console.log(chalk.yellow("\n未选择任何课程"));
      process.exit();
    }

    // 提交选课
    const submitSpinner = ora("正在提交选课申请...").start();
    const succeeded = [] as string[];

    while (succeeded.length < selected.length) {
      for (const { code, type, name } of selected) {
        if (succeeded.includes(code)) {
          continue;
        }
        try {
          const result = await submitRequest(
            session,
            cookies,
            type,
            semesterResponse,
            code,
          );
          if (result === "success") {
            submitSpinner.succeed(`[${type}] ${code} ${name} 申请成功`);
            succeeded.push(code);
          } else if (result === "notWithinTime") {
            submitSpinner.fail(
              `[${type}] ${code} ${name} 申请失败：不在选课时间范围内！`,
            );
          } else {
            submitSpinner.fail(`[${type}] ${code} ${name} 失败: ${result}`);
          }
        } catch (err) {
          submitSpinner.fail(
            `[${type}] ${code} ${name} 请求异常: ${(err as Error).message}`,
          );
        }
      }
    }
  } catch (error) {
    console.error(chalk.red("\n发生错误："), error);
    process.exit(1);
  }
};

main();
