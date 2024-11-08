//=============================================================================
// TFL_MZ_AUTOSAVE.js
// ----------------------------------------------------------------------------
// ver1.00
// Copyright (c) 2024 tasteful
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php
//=============================================================================

/*:
 * @plugindesc Increased RMMZ autosave slots.
 * @author tasteful-1
 * @target MZ
 * @base PluginCommonBase
 * @orderAfter PluginCommonBase
 * @url https://github.com/Tasteful-1
 *
 * @param maxSavefiles
 * @desc Set the maximum number of manual save slots (1 to 50)
 * @default 20
 * @min 1
 * @max 50
 *
 * @param numSaveSlots
 * @desc Select the number of slots to use for auto-save.
 * @default 5
 *
 * @param AutoSaveText
 * @desc Sets the term to display in the save window.
 * @default Autosave
 *
 *
 * @help
 *
 * RMMZ’s default autosave only saves to one slot.
 *
 * This plugin expands autosave to multiple slots,
 *
 * automatically saving in sequence to your chosen slots.
 *
 * The total number of save slots is (maxSavefiles + numSaveSlots).
 *
 * It does not provide plugin commands.
 */
/*:ko
 * @plugindesc RMMZ 오토세이브 슬롯 증가.
 * @author tasteful-1
 * @target MZ
 * @base PluginCommonBase
 * @orderAfter PluginCommonBase
 * @url https://github.com/Tasteful-1
 *
 * @param maxSavefiles
 * @desc 수동세이브 슬롯의 갯수를 설정합니다.(1~50)
 * @default 20
 * @min 1
 * @max 50
 *
 * @param numSaveSlots
 * @desc 자동저장에 사용할 슬롯의 갯수를 선택합니다.
 * @default 5
 *
 * @param AutoSaveText
 * @desc 세이브 윈도우에 표시할 용어를 설정합니다.
 * @default 자동저장
 *
 * @help
 *
 * MZ의 기본 오토세이브는 한 칸 밖에 지원을 안해줍니다.
 *
 * 이 플러그인은 사용자가 지정한 세이브 슬롯들을 순회하며,
 *
 * 더 많은 슬롯을 대상으로 오토세이브를 지원할 수 있습니다.
 *
 * 세이브슬롯의 총 수는 (maxSavefiles + numSaveSlots) 입니다.
 *
 * 플러그인 커맨드는 없습니다.
 */
//****************************************
(() => {
	"use strict";
	const pluginName = "TFL_MZ_AUTOSAVE";

	const parameters = PluginManager.parameters(pluginName);
	const maxSavefiles = Number(parameters["maxSavefiles"] || 20);
	const numSaveSlots = Number(parameters["numSaveSlots"] || 5);
	const autosaveText = String(parameters["AutoSaveText"] || '자동저장');

//****************************************
	// Optautosave 를 true로 고정
	Game_System.prototype.isAutosaveEnabled = function() {
		return true;
	};

	//자동저장 설정과 무관하게 세이브 화면에 오토세이브 칸이 나타나지 않게 설정
	Window_SavefileList.prototype.indexToSavefileId = function(index) {
		return index + 1;
	};
//****************************************
	//세이브 슬롯 수 지정
	Window_SavefileList.prototype.maxItems = function() {
		return maxSavefiles + numSaveSlots
	};

	// 자동 저장 시작 슬롯과 최대 저장 슬롯 개수 설정
	DataManager.autosaveSlotStart = 1; // 자동 저장 시작 슬롯 (1번부터 사용)
	DataManager.numSaveSlots = numSaveSlots;   // 자동 저장 슬롯 개수 (예: 20개)

	// 현재 저장 슬롯 인덱스 관리
	ConfigManager.lastSaveIndex = 1; // 마지막으로 사용된 저장 슬롯 인덱스 초기값

	//세이브파일 번호 조정
	Window_SavefileList.prototype.drawTitle = function(savefileId, x, y) {
		if (savefileId <= numSaveSlots){
			this.drawText(autosaveText + " " + savefileId, x, y, 180);
		} else {
			this.drawText(TextManager.file + " " + (savefileId - numSaveSlots), x, y, 180);
		}
	};
//****************************************
	// 저장 가능 여부 확인 함수
    const isSaveAllowed = function(savefileId) {
        return savefileId >= 1 + numSaveSlots;
    };

    // Scene_File의 savefileId 메소드는 원본 유지
    const _Scene_File_savefileId = Scene_File.prototype.savefileId;
    Scene_File.prototype.savefileId = function() {
        const savefileId = _Scene_File_savefileId.call(this);
        return savefileId;
    };

    // Scene_Save의 isSaveEnabled 메소드만 수정
    const _Scene_Save_isSaveEnabled = Scene_Save.prototype.isSaveEnabled;
    Scene_Save.prototype.isSaveEnabled = function() {
        const original = _Scene_Save_isSaveEnabled.call(this);
        return original && isSaveAllowed(this.savefileId());
    };

    // Window_SavefileList의 drawTitle 메소드 수정
    const _Window_SavefileList_drawTitle = Window_SavefileList.prototype.drawTitle;
    Window_SavefileList.prototype.drawTitle = function(savefileId, x, y) {
        // Scene_Save인 경우에만 "저장 불가" 표시
        if (SceneManager._scene instanceof Scene_Save && !isSaveAllowed(savefileId)) {
                this.changeTextColor(ColorManager.textColor(8));
                this.drawText(autosaveText + " " + savefileId, x, y, 180);
                this.resetTextColor();
                return;
        }
        _Window_SavefileList_drawTitle.call(this, savefileId, x, y);
    };

    // StorageManager의 saveGame 메소드 수정
    const _StorageManager_saveGame = StorageManager.saveGame;
    StorageManager.saveGame = function(savefileId) {
        if (!isSaveAllowed(savefileId)) {
            return Promise.reject(new Error("This save slot is restricted."));
        }
        return _StorageManager_saveGame.call(this, savefileId);
    };

    // Window_SavefileList의 isEnabled 메소드 수정
    const _Window_SavefileList_isEnabled = Window_SavefileList.prototype.isEnabled;
    Window_SavefileList.prototype.isEnabled = function(savefileId) {
        const original = _Window_SavefileList_isEnabled.call(this, savefileId);
        // Scene_Save인 경우에만 저장 제한 적용
        if (SceneManager._scene instanceof Scene_Save) {
            return original && isSaveAllowed(savefileId);
        }
        return original;
    };
//****************************************
	// 마지막 사용된 저장 슬롯 인덱스 로드
	DataManager.loadLastSaveIndex = function() {
		if (isNaN(ConfigManager.lastSaveIndex)) {
			ConfigManager.lastSaveIndex = DataManager.autosaveSlotStart;
		}
		this._currentSaveIndex = ConfigManager.lastSaveIndex;
		console.log("Loaded last save index:", this._currentSaveIndex);
	};

	// 마지막 사용된 저장 슬롯 인덱스 저장
	DataManager.saveLastSaveIndex = function() {
		if (!isNaN(this._currentSaveIndex)) {
			ConfigManager.lastSaveIndex = this._currentSaveIndex;
			ConfigManager.save();
			console.log("Saved last save index:", this._currentSaveIndex);
		} else {
			console.warn("Invalid save index, not saving:", this._currentSaveIndex);
		}
	};

	// 게임 시작 시 마지막 저장 인덱스를 불러오기
	const _Scene_Boot_start = Scene_Boot.prototype.start;
	Scene_Boot.prototype.start = function() {
		_Scene_Boot_start.call(this);
		DataManager.loadLastSaveIndex(); // 마지막 저장 슬롯 인덱스를 로드
	};
//****************************************
	// 자동 저장 함수 수정
	Scene_Base.prototype.executeAutosave = function() {
		$gameSystem.onBeforeSave();

		let saveSlot = ((DataManager._currentSaveIndex || DataManager.autosaveSlotStart) % DataManager.numSaveSlots) + 1;
		saveSlot = Math.max(DataManager.autosaveSlotStart, Math.min(saveSlot, DataManager.numSaveSlots));
		console.log("Calculated autosave slot:", saveSlot);

		DataManager.saveGame(saveSlot)
			.then(() => {
				this.onAutosaveSuccess();
				DataManager._currentSaveIndex = saveSlot;
				DataManager.saveLastSaveIndex();
			})
			.catch(() => this.onAutosaveFailure());
	};
//****************************************
})();
