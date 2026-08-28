import * as cheerio from "cheerio";
import { type Element } from "domhandler";

export type Course = {
  "number": string;
  "code": string;
  "name": string;
  "campus": string;
  "info": string;
  "type": string;
  "department": string;
  "credit": string;
  "duration": string;
  "requirement": string;
  "capacity": string;
};

// 表头文字 → 字段名。教务系统选课表列结构经常变，这里按表头名做映射，
// 而不是按固定列索引，避免“Invalid index: N”这类错位。
const HEADER_RULES: Array<{ reg: RegExp; field: string }> = [
  { reg: /课程代码/, field: "code" },
  { reg: /课程名称/, field: "name" },
  { reg: /前置课程/, field: "prerequisite" },
  { reg: /面向对象/, field: "qualification" },
  { reg: /校区/, field: "campus" },
  { reg: /上课信息/, field: "info" },
  { reg: /排课信息/, field: "schedule-info" },
  { reg: /课程类别/, field: "type" },
  { reg: /课程性质/, field: "compulsory" },
  { reg: /开课院系/, field: "department" },
  { reg: /学分/, field: "credit" },
  { reg: /学时/, field: "duration" },
  { reg: /备注信息/, field: "remark" },
  { reg: /选课要求/, field: "requirement" },
  { reg: /已选\/容量/, field: "capacity" },
  { reg: /容量/, field: "capacity" },
  { reg: /序号/, field: "number" },
];

function cleanString(src: string): string {
  // remove all the html tags
  return src.replace("<br>", "\n")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/\s+/g, "\n")
    .trim();
}

function normalizeHeader(text: string): string {
  // 去掉排序箭头和空白
  return text.replace(/[↑↓\s]/g, "");
}

// 从表头 <th> 读出一列对应字段名；第一列通常是选择框/序号按钮，返回 "button"。
function buildFieldMap(
  $: cheerio.CheerioAPI,
  table: cheerio.Cheerio<Element>,
): string[] {
  const headerTr = table.find("tr").first();
  const ths = headerTr.find("th").toArray();
  return ths.map((th) => {
    const text = normalizeHeader($(th).text());

    if (text === "") return "button";

    return HEADER_RULES.find(({ reg }) => reg.test(text))?.field ?? "unknown";
  });
}

export function parseAPage(html: string): Array<Course> {
  const $ = cheerio.load(html);
  // find the only tbody with class bot_line
  const table = $("table.bot_line").first();
  const fieldMap = buildFieldMap($, table);
  const trs = table.find("tr").toArray();
  return trs.flatMap((tr) => {
    const tds = $(tr).find("td").toArray();
    // 表头行是 <th>，没有 <td>，跳过
    if (tds.length === 0) return [];
    const course = Object.fromEntries(
      tds.map((td, i) => [
        fieldMap[i] ?? "unknown",
        cleanString($(td).html() ?? ""),
      ]),
    ) as Course;
    try {
      // rwh（选课用的课程标识）放在最后一列的 input 的 id 里，形如 xxx_<rwh>
      const inputId = $(tds[tds.length - 1]).find("input").attr("id");
      course["code"] = inputId?.split("_")[1] ?? course["code"] ?? "";
    } catch {
      console.error(
        `\n\n当前课程\n${
          JSON.stringify(course)
        }\n解析出错，将会跳过，请提交issue`,
      );
      return [];
    }
    return [course as Course];
  });
}

export function parseCourses(
  htmls: Record<string, Array<string>>,
): Record<string, Array<Course>> {
  return Object.fromEntries(
    Object.entries(htmls).map(([key, htmls]) => [
      key,
      htmls.flatMap((html) => {
        return parseAPage(html);
      }),
    ]),
  );
}
