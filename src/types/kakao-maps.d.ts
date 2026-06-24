declare namespace kakao.maps {
  class LatLng {
    constructor(lat: number, lng: number);
  }

  class Map {
    constructor(container: HTMLElement, options: { center: LatLng; level: number });
    setCenter(latlng: LatLng): void;
    panTo(latlng: LatLng): void;
    setLevel(level: number, options?: { animate?: boolean }): void;
    getLevel(): number;
    relayout(): void;
    addControl(control: object, position: number): void;
  }

  class CustomOverlay {
    constructor(options: {
      position: LatLng;
      content: HTMLElement;
      yAnchor?: number;
      xAnchor?: number;
      zIndex?: number;
    });
    setMap(map: Map | null): void;
  }

  class ZoomControl {}

  const ControlPosition: { TOPRIGHT: number };

  class Marker {
    constructor(options: {
      map?: Map;
      position: LatLng;
      title?: string;
      clickable?: boolean;
    });
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

  namespace event {
    function addListener(
      target: Map | Marker | object,
      type: string,
      callback: () => void
    ): void;
  }

  function load(callback: () => void): void;

  let readyState: number;
}

interface Window {
  kakao: typeof kakao;
}

declare const kakao: {
  maps: typeof kakao.maps;
};
