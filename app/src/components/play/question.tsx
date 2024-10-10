import {Box, Button, Flex, Image, Kbd, Show, SimpleGrid} from "@chakra-ui/react";
import {Select} from "chakra-react-select";
import AppContext, {Answer, Species} from "../../core/app-context";
import {useCallback, useContext} from "react";

export const QuestionComponent = () => {

  const {game, player, commitAnswer} = useContext(AppContext);
  const shortcuts = ['a', 'j', 's', 'k', 'd', 'l']
  const question = game?.question
  const checkAnswer = (species: Species) => {
    if (game && player) {
      const answer: Answer = {
        question: game.question,
        answer: species,
        player: player
      }
      commitAnswer && commitAnswer(answer)

    }
  }
  const species: Species[] = []

  if (!question) {
    return <></>
  }

  return (
    <>
      <Box position={'relative'}>
        <Image
          src={question.images[0].url.replace('/1800', '/900')}
          fallback={<Image src='/images/jizz-logo.png' width={'200px'} marginX={'auto'}
                           marginY={['20px', '150px']}/>}
        />
      </Box>
      {question.options && question.options.length ? (
        <SimpleGrid columns={{base: 1, md: 2}} spacing={4}>
          {
            question.options.map((option, key) => {
              return (
                <Button key={key} colorScheme='orange' onClick={() => checkAnswer(option)}>
                  <Flex justifyContent={'space-between'} width={'100%'}>
                    {option && player?.language === 'nl' ? option.name_nl : option.name}
                    <Show above={'md'}>
                      <Kbd size='lg' backgroundColor={'orange.600'}
                           borderColor={'orange.800'}>{shortcuts[key]}</Kbd>
                    </Show>
                  </Flex>
                </Button>
              )
            })
          }
        </SimpleGrid>

      ) : (
        <Select
          autoFocus={true}
          options={species.map((q) => ({label: q.name, value: q}))}
          onChange={(answer) => answer && checkAnswer(answer.value)}
        />
      )}
    </>)
}