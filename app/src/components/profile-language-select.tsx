import LanguageCombobox from "./language-combobox";

interface LanguageSelectProps {
  languages: { code: string; name: string }[];
  value: string;
  onChange: (value: string) => void;
}

export const ProfileLanguageSelect = ({ languages, value, onChange }: LanguageSelectProps) => {
  const languagesArray = Array.isArray(languages) ? languages : [];

  return (
    <LanguageCombobox
      languages={languagesArray}
      value={value}
      onChange={onChange}
    />
  );
};
