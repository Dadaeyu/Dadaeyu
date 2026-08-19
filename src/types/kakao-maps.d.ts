declare namespace kakao.maps {
  class LatLng {
    constructor(lat: number, lng: number);
  }

  class LatLngBounds {
    constructor();
    extend(latlng: LatLng): void;
    isEmpty(): boolean;
    contain(latlng: LatLng): boolean;
  }

  class Point {
    constructor(x: number, y: number);
    x: number;
    y: number;
  }

  class Map {
    constructor(container: HTMLElement, options: { center: LatLng; level: number });
    setCenter(latlng: LatLng): void;
    getCenter(): LatLng;
    panTo(latlngOrBounds: LatLng | LatLngBounds, padding?: number): void;
    /** 지도 중심을 픽셀 단위로 이동 (x: 가로, y: 세로) */
    panBy(dx: number, dy: number): void;
    setBounds(
      bounds: LatLngBounds,
      paddingTop?: number,
      paddingRight?: number,
      paddingBottom?: number,
      paddingLeft?: number
    ): void;
    setLevel(level: number, options?: { animate?: boolean }): void;
    getLevel(): number;
    getBounds(): LatLngBounds;
    relayout(): void;
    getProjection(): MapProjection;
    addControl(control: object, position: number): void;
    removeControl(control: object): void;
  }

  interface MapProjection {
    /** 지도 좌표 → 지도 내부 픽셀 좌표 */
    pointFromCoords(latlng: LatLng): Point;
    /** 지도 내부 픽셀 좌표 → 지도 좌표 */
    coordsFromPoint(point: Point): LatLng;
    /** 지도 좌표 → 컨테이너 픽셀 (지원 시) */
    containerPointFromCoords?(latlng: LatLng): Point;
    /** 컨테이너 픽셀 → 지도 좌표 (지원 시) */
    coordsFromContainerPoint?(point: Point): LatLng;
  }

  class CustomOverlay {
    constructor(options: {
      position: LatLng;
      content: HTMLElement;
      yAnchor?: number;
      xAnchor?: number;
      zIndex?: number;
      clickable?: boolean;
    });
    setMap(map: Map | null): void;
    setPosition(position: LatLng): void;
  }

  class ZoomControl {}

  const ControlPosition: { TOPRIGHT: number };

  class Marker {
    constructor(options: { map?: Map; position: LatLng; title?: string; clickable?: boolean });
    setMap(map: Map | null): void;
  }

  class Polyline {
    constructor(options: {
      map?: Map;
      path: LatLng[];
      strokeWeight?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeStyle?: string;
      zIndex?: number;
    });
    setMap(map: Map | null): void;
  }

  interface MouseEvent {
    latLng: LatLng;
  }

  namespace event {
    function addListener(
      target: Map | Marker | Polyline | object,
      type: string,
      callback: (event: MouseEvent) => void
    ): void;
  }

  function load(callback: () => void): void;

  let readyState: number;

  namespace services {
    class Places {
      keywordSearch(
        keyword: string,
        callback: (data: unknown[], status: string) => void,
        options?: { size?: number }
      ): void;
    }

    const Status: { OK: string };
  }
}

interface Window {
  kakao: typeof kakao;
}

declare const kakao: {
  maps: typeof kakao.maps;
};
