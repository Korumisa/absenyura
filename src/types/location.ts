export interface Location {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radius: number;
  wifi_bssid: string[];
}
