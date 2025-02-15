import { Axios } from "axios";

export function configureHeaders(session: Axios) {
  session.defaults.headers.common["User-Agent"] =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15";
}
