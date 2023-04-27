import requests as rq
from lxml import etree
import execjs
from dataclasses import dataclass
from bs4 import BeautifulSoup as bs
from requests.packages import urllib3

urllib3.disable_warnings()

@dataclass(frozen=True)
class Course:
    code: str
    name: str
    detail: str
    id: str
    semester: str
    kind: str


class Automator:

    def __init__(self, vpn=True) -> None:
        with open('./encrypt.js', 'r') as f:
            self.js = execjs.compile(f.read())
        self.session = rq.Session()
        self.base_header = {
            'Connection': 'keep-alive',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate',
            'Accept-Language': 'en-GB,en;q=0.9',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': 'http://authserver.hitwh.edu.cn',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15',
            'Upgrade-Insecure-Requests': '1',
            # 'Referer': '''http://authserver.hitwh.edu.cn/authserver/login?service=http%3A%2F%2F172.26.64.16%2FloginCAS'''
        }
        self.all_kinds = ['yy', 'ty', 'szhx',
            'cxyx', 'cxsy', 'cxcy', 'tsk', 'xsxk']
        self.data = []
        self.vpn = vpn
        if not vpn:
            self.login_url = '''http://authserver.hitwh.edu.cn/authserver/login?service=http%3A%2F%2F172.26.64.16%2FloginCAS'''
            self.query_list_url = '''http://172.26.64.16/xsxk/queryXsxkList'''
            self.submit_url = '''http://172.26.64.16/xsxk/saveXsxk'''
        else:
            self.login_url = '''http://authserver-hitwh-edu-cn.ivpn.hitwh.edu.cn:8118/authserver/login?service=https%3A%2F%2Fivpn.hitwh.edu.cn%2Fauth%2Fcas_validate%3Fentry_id%3D1'''
            self.admin_url = '''http://172-26-64-16.ivpn.hitwh.edu.cn:8118/loginCAS'''
            self.query_list_url = '''http://172-26-64-16.ivpn.hitwh.edu.cn:8118/xsxk/queryXsxkList'''
            self.submit_url = '''http://172-26-64-16.ivpn.hitwh.edu.cn:8118/xsxk/saveXsxk'''

    def __del__(self) -> None:
        self.session.close()

    def login(self, un: str, raw_pwd: str):
        login = self.session.get(self.login_url, verify=False)
        login_html = etree.HTML(login.text)
        lt = login_html.xpath('//*[@id="casLoginForm"]/input[1]/@value')[0]
        dllt = login_html.xpath('//*[@id="casLoginForm"]/input[2]/@value')[0]
        execution = login_html.xpath(
            '//*[@id="casLoginForm"]/input[3]/@value')[0]
        _eventId = 'submit'
        rmShown = login_html.xpath(
            '//*[@id="casLoginForm"]/input[5]/@value')[0]
        pwdDefaultEncryptSalt = login_html.xpath(
            '//*[@id="pwdDefaultEncryptSalt"]/@value')[0]
        # pwdDefaultEncryptSalt = '''LWxdhueboDGfIh9P'''
        pwd = self.js.call('encryptAES', raw_pwd, pwdDefaultEncryptSalt)
        redirect = self.session.post(self.login_url, headers=self.base_header,
                                     data={
                                         'username': un,
                                         'password': pwd,
                                         'lt': lt,
                                         'dllt': dllt,
                                         'execution': execution,
                                         '_eventId': _eventId,
                                         'rmShown': rmShown
                                     },
                                     cookies={
                                         'org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE': 'en'
                                     },
                                     allow_redirects=True,
                                     verify=False
                                     )
        if self.vpn:
            self.session.get(self.admin_url, headers=self.base_header)
        # print(redirect.text)
        pass

    def fetch_all(self, semester: str):
        for kind in self.all_kinds:
            self.fetch_one(kind, semester)
        pass

    def fetch_one(self, kind: str, semester: str):
        raw_html = self.session.get(self.query_list_url,
                                    params={
                                        'pageXklb': kind,
                                        'pageXnxq': semester
                                    },
                                    headers=self.base_header,
                                    verify=False
                                    ).text
        html = etree.HTML(raw_html)
        single_paged = len(html.xpath(
            '/html/body/div[7]/div/div[7]/form')) == 0

        def parse(raw: str) -> list[Course]:
            soup = bs(raw, 'html.parser')
            table = soup.select_one(
                'body > div.Contentbox > div > div.list > table')
            ret = []
            # 0 is the header
            for tr in table.select('tr')[1:]:
                tds = tr.find_all('td')
                ret.append(
                    Course(
                        tds[2].text,
                        tds[3].text,
                        tds[7].text,
                        tds[-1].select_one('input')['id'].strip('xkyq_'),
                        semester,
                        kind
                    )
                )
            return ret

        if single_paged:
            self.data += parse(raw_html)
        else:
            page_size = html.xpath('//*[@id="pageSize"]/@value')[0]
            count = html.xpath('//*[@id="pageCount"]/@value')[0]
            for i in range(int(count)):
                if i == 0:
                    self.data += parse(raw_html)
                else:
                    raw = self.session.post(
                        self.query_list_url,
                        headers=self.base_header,
                        params={
                            'pageXklb': kind,
                            'pageXnxq': semester,
                            'pageNo': i + 1,
                            'pageCount': count,
                            'pageSize': page_size
                        },
                        verify=False
                    ).text
                    self.data += parse(raw)
        pass

    def submit(self, id: str, kind: str, semester: str) -> bool:

        token_dummy = etree.HTML(self.session.post(
            self.query_list_url,
            headers=self.base_header,
            data={
                'pageXklb': kind,
                'pageXnxq': semester
            }
        ).text)
        token = token_dummy.xpath('//*[@id="token"]/@value')[0]
        # token='''0.18708587086715955'''
        return self.session.post(
                self.submit_url,
                headers=self.base_header,
                allow_redirects=False,
                data={
                    'kcdmpx': '',
                    'kcmcpx': '',
                    'rlpx': '',
                    'zy': '',
                    'qz': '',
                    'pageKkxiaoqu': '',
                    'pageKkyx': '',
                    'pageKcmc': '',
                    'rwh': id,
                    'pageXklb': kind,
                    'pageXnxq': semester,
                    'token': token
                },
                verify=False
            ).status_code == 302

# auto = Automator(False)
# auto.submit('xkyq_2022-2023-2-AD22923-002', 'szhx', '2022-20232')


# auto.fetch_all('2022-20232')
# print(auto.data)

# print(session.cookies)
# administration system
# print(redirect.text)

# print(session.get('http://172.26.64.16/xsxk/queryXsxk', params= {
#     'pageXklb': 'yy'}, headers=base_header).text)
