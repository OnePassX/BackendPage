import { useCallback, useEffect, useRef, useState } from "react";
import { Cropper, type ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css";
import {
	Loader2Icon,
	RefreshCcwIcon,
	RotateCcwIcon,
	RotateCwIcon,
	ZoomInIcon,
	ZoomOutIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { uploadAvatar } from "@/api/other";

interface ImageCropperProps {
	/** 固定裁剪比例（宽/高），默认 1 即 1:1 正方形 , 0 表示不限制比例自由裁剪 */
	aspectRatio?: number;
	/** 裁剪后导出图片的最大边长（像素），默认 512 */
	maxSize?: number;
	/** 裁剪上传成功回调，fileUrl 为上传后的图片地址 */
	onUploaded?: (fileUrl: string, file: File) => void;
	/** 上传失败回调 */
	onError?: (error: unknown) => void;
	/** 自定义上传实现；不传时默认使用 uploadAvatar */
	upload?: (file: File) => Promise<{ fileName?: string; fileUrl?: string }>;
	/** 触发区域渲染函数（点击后打开文件选择框） */
	trigger: (props: { onClick: () => void }) => React.ReactNode;
	/** 禁用图片选择 */
	disabled?: boolean;
}

export function ImageCropper({
	aspectRatio = 1,
	maxSize = 512,
	onUploaded,
	onError,
	upload,
	trigger,
	disabled = false,
}: ImageCropperProps) {
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const cropperRef = useRef<ReactCropperElement | null>(null);

	const [dialogOpen, setDialogOpen] = useState(false);
	const [imageSrc, setImageSrc] = useState("");
	const [originalName, setOriginalName] = useState("");
	const [ready, setReady] = useState(false);
	const [isUploading, setIsUploading] = useState(false);

	// 打开系统文件选择框
	const handlePick = useCallback(() => {
		if (disabled || isUploading) return;
		fileInputRef.current?.click();
	}, [disabled, isUploading]);

	// 选中本地图片 → 打开裁剪弹窗
	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		e.target.value = ""; // 清空 input，允许重复选择同一文件
		if (!file) return;
		if (!file.type.startsWith("image/")) {
			toast.error("请选择图片文件");
			return;
		}
		setOriginalName(file.name.replace(/\.[^.]+$/, "") || "avatar");
		setImageSrc(URL.createObjectURL(file));
		setReady(false);
		setDialogOpen(true);
	};

	// 弹窗关闭后释放 object URL 并重置，保证下次打开重新加载图片
	useEffect(() => {
		if (!dialogOpen) {
			setImageSrc((prev) => {
				if (prev) URL.revokeObjectURL(prev);
				return "";
			});
			setReady(false);
		}
	}, [dialogOpen]);

	const getCropper = () => cropperRef.current?.cropper ?? null;

	// ── 工具栏：图片缩放 / 旋转 / 重置（移动、裁剪框拖动与等比缩放由 Cropper 原生支持） ──
	const handleZoomIn = () => getCropper()?.zoom(0.1);
	const handleZoomOut = () => getCropper()?.zoom(-0.1);
	const handleRotateLeft = () => getCropper()?.rotate(-90);
	const handleRotateRight = () => getCropper()?.rotate(90);
	const handleReset = () => getCropper()?.reset();

	// ── 按裁剪框导出图片并上传 ──
	const handleConfirm = async () => {
		const cropper = getCropper();
		if (!cropper || isUploading) return;

		let blob: Blob | null = null;
		try {
			const canvas = cropper.getCroppedCanvas({
				maxWidth: maxSize,
				maxHeight: maxSize,
				imageSmoothingEnabled: true,
				imageSmoothingQuality: "high",
			});
			blob = await new Promise<Blob | null>((resolve) =>
				canvas.toBlob(resolve, "image/png")
			);
		} catch (e) {
			onError?.(e);
			return;
		}
		if (!blob) return;

		const file = new File([blob], `${originalName}-cropped.png`, { type: blob.type });
		setIsUploading(true);
		try {
			const doUpload =
				upload ??
				(async (f: File) => {
					const res = await uploadAvatar("avatar", f);
					return (res?.data ?? {}) as { fileName?: string; fileUrl?: string };
				});
			const res = await doUpload(file);
			onUploaded?.(res?.fileUrl ?? "", file);
			setDialogOpen(false);
		} catch (e) {
			onError?.(e);
		} finally {
			setIsUploading(false);
		}
	};

	return (
		<>
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={handleFileChange}
			/>
			{trigger({ onClick: handlePick })}

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="sm:max-w-180">
					<DialogHeader>
						<DialogTitle>裁剪图片</DialogTitle>
						<DialogDescription>
							拖动图片或裁剪框调整位置，滚动滚轮缩放图片，也可使用工具栏缩放 / 旋转
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-3 h-120">
						<div className="flex items-center justify-center gap-1">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleZoomOut}
								disabled={!ready || isUploading}
								title="缩小"
							>
								<ZoomOutIcon className="size-4" />
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleZoomIn}
								disabled={!ready || isUploading}
								title="放大"
							>
								<ZoomInIcon className="size-4" />
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleRotateLeft}
								disabled={!ready || isUploading}
								title="向左旋转"
							>
								<RotateCcwIcon className="size-4" />
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleRotateRight}
								disabled={!ready || isUploading}
								title="向右旋转"
							>
								<RotateCwIcon className="size-4" />
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleReset}
								disabled={!ready || isUploading}
								title="重置"
							>
								<RefreshCcwIcon className="size-4" />
							</Button>
						</div>

						<div className="overflow-hidden rounded-lg border bg-muted/40">
							{imageSrc && (
								<Cropper
									ref={cropperRef}
									src={imageSrc}
									alt="待裁剪图片"
									style={{ height: 340, width: "100%" }}
									aspectRatio={aspectRatio}
									viewMode={1}
									dragMode="move"
									toggleDragModeOnDblclick={false}
									autoCropArea={1}
									background={false}
									minCropBoxWidth={50}
									minCropBoxHeight={50}
									ready={() => setReady(true)}
								/>
							)}
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setDialogOpen(false)}
							disabled={isUploading}
						>
							取消
						</Button>
						<Button
							type="button"
							onClick={handleConfirm}
							disabled={!ready || isUploading}
						>
							{isUploading && <Loader2Icon className="size-4 animate-spin" />}
							{isUploading ? "上传中..." : "裁剪并上传"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
