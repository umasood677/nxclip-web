import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

export function SocialDisconnectDialog({
  open,
  platformLabel,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  platformLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onCancel()}>
      <DialogContent showCloseButton={!busy} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("profile.edit.disconnect_title")}</DialogTitle>
          <DialogDescription>
            {t("profile.edit.disconnect_confirm", { platform: platformLabel })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button type="button" variant="destructive" onClick={() => void onConfirm()} disabled={busy}>
            {t("profile.edit.disconnect_btn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
