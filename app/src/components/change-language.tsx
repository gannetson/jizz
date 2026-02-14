import {useContext} from "react";
import AppContext from "../core/app-context";
import {Box, Flex} from "@chakra-ui/react"
import Flag from "react-world-flags";

const LANGUAGES = [
  { code: 'en', flag: 'gb' },
  { code: 'en_US', flag: 'us' },
  { code: 'nl', flag: 'nl' },
] as const

type LanguageCode = (typeof LANGUAGES)[number]['code']

const ChangeLanguage = () => {
  const {language, setLanguage} = useContext(AppContext);

  const onChange = (value: LanguageCode) => {
    setLanguage && setLanguage(value)
  }

  return (
    <Box>
      <Flex gap={4} justify="center">
        {LANGUAGES.map(({ code, flag }) => (
          <Box
            key={code}
            cursor="pointer"
            transition="all 0.2s"
            opacity={language === code ? 1 : 0.5}
            _hover={{ 
              opacity: 0.8,
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
            }}
            onClick={() => onChange(code)}
            position="relative"
            height="50px"
            boxShadow="0 2px 4px rgba(0,0,0,0.1)"
            border="2px solid"
            p={'4px'}
            borderColor={language === code ? "primary.500" : "transparent"}
            borderRadius="md"
            bg={language === code ? "primary.200" : "transparent"}
          >
            <Flag 
              code={flag}
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