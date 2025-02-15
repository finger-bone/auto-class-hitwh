请求 `https://webvpn.hitwh.edu.cn`，redirect 得到一个有额外内容的，形如

```txt
https://webvpn.hitwh.edu.cn/https/{id}/authserver/login?service=https%3A%2F%2Fwebvpn.hitwh.edu.cn%2Flogin%3Fcas_login%3Dtrue
```

的 url。记 `authserver` 之前（包括 `authserver` 该子路径）为 base url。

去找二维码的 url，是，

```txt
{baseurl}?vpn-1&uuid={uuid}
```

测试后 `vpn-1` 不变，uuid 变。抓包后发现生产 uuid 的方法是向
`{baseurl}/qrCode/getToken?vpn-12-o2-ids.hit.edu.cn&ts={ts}`。测试后`vpn-12-o2-ids.hit.edu.cn`
参数不变，后面 `ts` 会变。

翻 js 文件发现 `qrcode.js` 有发送请求的代码，ts 就是 `Date.now()`，即时间戳。

因此获取二维码即先获取 token，再用 token 拿二维码图片。

拿到二维码图片后，逆向登陆部分。抓包有许多状态检查，显然是轮询。在 `qrcode.js`
中发现有检查状态代码，

```js
function isUsed() {
  $.ajax({
    url: contextPath + "/qrCode/getStatus.htl?ts=" + new Date().getTime(),
    data: { "uuid": $("#uuid").val() },
    dataType: "text",
    timeout: 5000,
    error: function () {
      clearTimeout(qr_time);
    },
    success: function (data, textStatus) {
      if (textStatus == "success" && data == "1") { // 请求成功
        clearTimeout(qr_time);
        $("#qrLoginForm").submit();
      }
      if (textStatus == "success" && data == "2") { // 二维码已被扫描跳
        $("#qr_code").hide();
        $("#qr_invalid").hide();
        $("#qr_success").show();
        $(".qrcode_img_tip").hide();
      }
      if (textStatus == "success" && data == "3") { // 二维码已失效页面
        clearTimeout(qr_time);
        $("#qr_code").hide();
        $("#qr_success").hide();
        $("#qr_invalid").show();
      }
    },
  });
}
```

直接写同一个逻辑就好。

注意实际请求的 url 是
`{baseUrl}/qrCode/getStatus.htl?vpn-12-o2-ids.hit.edu.cn&ts={ts}&uuid={uuid}`

这里多了个 `vpn-12-o2-ids.hit.edu.cn`。

然后是登陆逻辑，登陆用的一个表单，全部复制一遍就好。表单里有 UUID。

登陆要带上 cookie，cookie 在访问页面时直接获得。

保持 Cookie 后可进入选课系统，可直接处理表单。

npm:inquirer qrcode-terminal ora chalk cli-table3 axios
