/**
 * noVNC 1.7 没有自带 TypeScript 类型声明（package.json 无 types 字段），
 * 这里只声明本项目实际用到的 RFB 最小接口，避免在调用处散落 any。
 *
 * 官方 API 文档：https://github.com/novnc/noVNC/blob/master/docs/API.md
 * 注意：1.7 起入口是 `core/rfb.js`，必须 `import RFB from "@novnc/novnc"`，
 * 旧教程里的 `@novnc/novnc/lib/rfb` 已经不存在。
 */
declare module "@novnc/novnc" {
    export interface RFBCredentials {
        username?: string;
        password?: string;
        target?: string;
    }

    export interface RFBOptions {
        /** 同一台设备允许多个客户端同时观看（RealVNC 默认允许） */
        shared?: boolean;
        /** 预先提供凭据；不传时服务器要求密码会触发 credentialsrequired 事件 */
        credentials?: RFBCredentials;
        repeaterID?: string;
        wsProtocols?: string[];
    }

    export interface RFBCapabilities {
        power: boolean;
    }

    export interface RFBEvent extends Event {
        detail?: any;
    }

    export default class RFB {
        constructor(
            target: HTMLElement,
            urlOrChannel: string | WebSocket | RTCDataChannel,
            options?: RFBOptions,
        );

        background: string;
        clipViewport: boolean;
        compressionLevel: number;
        dragViewport: boolean;
        focusOnClick: boolean;
        qualityLevel: number;
        resizeSession: boolean;
        scaleViewport: boolean;
        viewOnly: boolean;
        readonly capabilities: RFBCapabilities;

        disconnect(): void;
        focus(): void;
        blur(): void;
        sendCredentials(credentials: RFBCredentials): void;
        sendCtrlAltDel(): void;
        sendKey(keysym: number, code: string | null, down?: boolean): void;
        clipboardPasteFrom(text: string): void;
        toBlob(callback: (blob: Blob) => void, type?: string, quality?: number): void;
        toDataURL(type?: string, encoderOptions?: any): string;
        machineReboot(): void;
        machineReset(): void;
        machineShutdown(): void;

        addEventListener(type: string, listener: (event: RFBEvent) => void): void;
        removeEventListener(type: string, listener: (event: RFBEvent) => void): void;
    }

    /** 构造器类型（动态 import 时用来标注默认导出） */
    export type RFBConstructor = typeof RFB;
}
