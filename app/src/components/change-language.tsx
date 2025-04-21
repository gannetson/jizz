import {useContext} from "react";
import AppContext from "../core/app-context";
import {Box, Flex} from "@chakra-ui/react"
import Flag from "react-world-flags";

const ChangeLanguage = () => {
  const {language, setLanguage} = useContext(AppContext);

  const onChange = (value: 'en' | 'nl' | 'la') => {
    setLanguage && setLanguage(value)
  }

  const getFlagCode = (lang: string) => {
    switch (lang) {
      case 'en': return 'gb';
      case 'nl': return 'nl';
      case 'la': return 'va';
      default: return 'gb';
    }
  }

  return (
    <Box>
      <Flex gap={4} justify="center">
        {(['en', 'nl', 'la'] as const).map((lang) => (
          <Box
            key={lang}
            cursor="pointer"
            transition="all 0.2s"
            opacity={language === lang ? 1 : 0.5}
            _hover={{ 
              opacity: 0.8,
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
            }}
            onClick={() => onChange(lang)}
            position="relative"
            height="50px"
            boxShadow="0 2px 4px rgba(0,0,0,0.1)"
            border="2px solid"
            p={'4px'}
            borderColor={language === lang ? "orange.500" : "transparent"}
            borderRadius="md"
            bg={language === lang ? "orange.200" : "transparent"}
          >
            <Flag 
              code={getFlagCode(lang)} 
              style={{ 
                width: '100%', 
                height: '100%',
                objectFit: 'cover'
              }} 
            />
          </Box>
        ))}
      </Flex>
    </Box>
  )
};

export default ChangeLanguage;