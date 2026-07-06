package com.example.whisperme.controller;

import com.example.whisperme.domain.ChatHistory;
import com.example.whisperme.domain.ChatMessage;
import com.example.whisperme.domain.MultiImageRequest;
import com.example.whisperme.service.ChatMessageService;
import com.example.whisperme.service.ChatService;
import com.example.whisperme.service.NaverSearchService;
import com.example.whisperme.service.OpenAIService;
import com.example.whisperme.service.QuestionRouterService;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = {"http://localhost:5173", "http://43.203.123.217:5173"})
public class ChatController {

    private final ChatService chatService;
    private final ChatMessageService chatMessageService;
    private final OpenAIService openAIService;
    private final NaverSearchService naverSearchService;
    private final QuestionRouterService questionRouterService;

    public ChatController(ChatService chatService,
                          ChatMessageService chatMessageService,
                          OpenAIService openAIService,
                          NaverSearchService naverSearchService,
                          QuestionRouterService questionRouterService) {
        this.chatService = chatService;
        this.chatMessageService = chatMessageService;
        this.openAIService = openAIService;
        this.naverSearchService = naverSearchService;
        this.questionRouterService = questionRouterService;
    }

    @PostMapping("/ask")
    public ChatHistory ask(@RequestBody ChatHistory chatHistory) {

        String question = chatHistory.getUserMessage();

        if (question == null || question.trim().isEmpty()) {
            chatHistory.setAiMessage("질문을 입력해줘.");
            return chatHistory;
        }

        question = question.trim();

        List<ChatMessage> history = chatHistory.getRoomId() != null
                ? chatMessageService.findRecentTextHistory(chatHistory.getRoomId(), 20)
                : new ArrayList<>();

        ChatMessage currentUserMessage = new ChatMessage();
        currentUserMessage.setRoomId(chatHistory.getRoomId());
        currentUserMessage.setRole("USER");
        currentUserMessage.setMessageType("TEXT");
        currentUserMessage.setContent(question);

        history.add(currentUserMessage);

        String answer;

        try {
            if (questionRouterService.needSearch(question)) {

                String keyword = questionRouterService.makeSearchKeyword(question, history);
                String searchResult = naverSearchService.searchSmart(question, keyword);

                answer = openAIService.askWithSearchResult(
                        history,
                        question,
                        searchResult
                );

            } else {
                answer = openAIService.askWithHistory(history);
            }

        } catch (Exception e) {
            e.printStackTrace();
            answer = "답변 생성 중 오류가 발생했어. 잠시 후 다시 시도해줘.";
        }

        chatHistory.setUserMessage(question);
        chatHistory.setAiMessage(answer);

        return chatHistory;
    }

    @PostMapping("/ask-images")
    public Map<String, String> askImages(@RequestBody MultiImageRequest request) {

        String userMessage = request.getUserMessage();
        List<String> fileUrls = request.getFileUrls();

        boolean hasMessage = userMessage != null && !userMessage.trim().isEmpty();
        boolean hasImages = fileUrls != null && !fileUrls.isEmpty();

        if (!hasMessage && !hasImages) {
            return Map.of("aiMessage", "이미지나 질문을 입력해줘.");
        }

        if (!hasMessage) {
            userMessage = "이 이미지를 자세히 분석해줘.";
        } else {
            userMessage = userMessage.trim();
        }

        String answer;

        try {
            answer = openAIService.askWithImages(
                    userMessage,
                    fileUrls
            );
        } catch (Exception e) {
            e.printStackTrace();
            answer = "이미지 분석 중 오류가 발생했어.";
        }

        return Map.of("aiMessage", answer);
    }

    @GetMapping("/news")
    public String news(@RequestParam String keyword) {

        if (keyword == null || keyword.trim().isEmpty()) {
            return "검색어를 입력해줘.";
        }

        return naverSearchService.search(keyword.trim());
    }

    @PostMapping("/save")
    public String save(@RequestBody ChatHistory chatHistory) {
        chatService.save(chatHistory);
        return "채팅 저장 완료";
    }

    @GetMapping("/list/{memberId}")
    public List<ChatHistory> list(@PathVariable Long memberId) {
        return chatService.findByMemberId(memberId);
    }

    @DeleteMapping("/delete/{id}")
    public String delete(@PathVariable Long id) {
        chatService.deleteChat(id);
        return "채팅 삭제 완료";
    }

    @PutMapping("/update/{id}")
    public String update(@PathVariable Long id,
                         @RequestBody ChatHistory chatHistory) {
        chatHistory.setId(id);
        chatService.updateChat(chatHistory);
        return "채팅 수정 완료";
    }
}
