import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Combobox, type ComboboxOption } from "../ui/Combobox";
import { useBranches } from "../../hooks/useBranches";

export function QuickSwitchCombobox({ currentBranchId }: { currentBranchId: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data } = useBranches();

  const options: ComboboxOption[] = (data?.items ?? [])
    .filter((b) => b.id !== currentBranchId)
    .map((b) => ({ id: b.id, label: b.cityName, sublabel: b.country }));

  return (
    <Combobox
      placeholder={t("hub.search_placeholder")}
      options={options}
      globalShortcut
      onSelect={(option) => navigate(`/antennes/${option.id}`)}
      className="w-full max-w-sm"
    />
  );
}
