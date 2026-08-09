declare namespace kakao.maps {
  class LatLng {
    constructor(lat: number, lng: number);
  }

  class LatLngBounds {
    constructor();
    extend(latlng: LatLng): void;
    isEmpty(): boolean;
  }

  class Map {
    constructor(container: HTMLElement, options: { center: LatLng; level: number });
    setCenter(latlng: LatLng): void;
    panTo(latlngOrBounds: LatLng | LatLngBounds, padding?: number): void;
    setBounds(
      bounds: LatLngBounds,
      paddingTop?: number,
      paddingRight?: number,
      paddingBottom?: number,
      paddingLeft?: number
    ): void;
    setLevel(level: number, options?: { animate?: boolean }): void;
    getLevel(): number;
    relayout(): void;
    addControl(control: object, position: number): void;
    removeControl(control: object): void;
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
